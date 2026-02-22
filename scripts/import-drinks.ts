import fs from "node:fs";
import path from "node:path";

import { loadEnvConfig } from "@next/env";
import { parse } from "csv-parse/sync";

import { createSupabaseAdminClient } from "../lib/supabase/admin";

loadEnvConfig(process.cwd());

const supabase = createSupabaseAdminClient();

const CHUNK_SIZE = 1000;

type InputRow = {
  type: string;
  name: string;
  drinkId: string;
  premium: string;
  description: string;
  bar: string;
};

type DrinkTypeRow = {
  id: string;
  name: string;
};

type BarRow = {
  id: string;
  name: string;
};

type DrinkRow = {
  id: string;
  drink_key: string;
};

function isTruthy(value: string) {
  const normalized = value.trim().toLowerCase();
  return ["1", "true", "yes", "y", "premium"].includes(normalized);
}

function normalizeColumns(row: Record<string, unknown>): InputRow {
  const normalized = Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key.trim().toLowerCase(), String(value ?? "").trim()])
  );

  return {
    type: String(normalized.type ?? ""),
    name: String(normalized.name ?? ""),
    drinkId: String(normalized.drink_id ?? ""),
    premium: String(normalized.premium ?? ""),
    description: String(normalized.description ?? ""),
    bar: String(normalized.bar ?? ""),
  };
}

function chunkArray<T>(items: T[], chunkSize: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }
  return chunks;
}

async function deleteAllRows(table: string, notNullColumn: string) {
  const { error } = await supabase.from(table).delete().not(notNullColumn, "is", null);
  if (error) {
    throw new Error(`Failed clearing ${table}: ${error.message}`);
  }
}

async function clearTables() {
  console.log("[1/7] Clearing existing data...");
  await deleteAllRows("drink_logs", "id");
  await deleteAllRows("drink_availability", "drink_id");
  await deleteAllRows("drinks", "id");
  await deleteAllRows("bars", "id");
  await deleteAllRows("drink_types", "id");
  await deleteAllRows("profiles", "id");
  console.log("[1/7] Clear complete.");
}

async function run() {
  const args = process.argv.slice(2).filter((arg) => arg !== "--");
  const shouldClear = args.includes("--clear");
  const tsvPathArg = args.find((arg) => !arg.startsWith("--"));

  if (!tsvPathArg) {
    throw new Error("Usage: yarn import:drinks <path/to/drinks.tsv> [--clear]");
  }

  const tsvPath = path.resolve(process.cwd(), tsvPathArg);

  if (!tsvPath.toLowerCase().endsWith(".tsv")) {
    throw new Error("Import only supports TSV files. Please provide a .tsv file.");
  }

  if (!fs.existsSync(tsvPath)) {
    throw new Error(`TSV not found at ${tsvPath}`);
  }

  const fileContents = fs.readFileSync(tsvPath, "utf8");
  const rawRows = parse(fileContents, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    delimiter: "\t",
  }) as Record<string, unknown>[];

  const parsedRows = rawRows.map(normalizeColumns);
  const validRows = parsedRows.filter((row) => row.type && row.name && row.drinkId && row.bar);
  const skippedRows = parsedRows.length - validRows.length;

  if (shouldClear) {
    await clearTables();
  } else {
    console.log("[1/7] Skipping clear (pass --clear to wipe tables first).");
  }

  console.log(`[2/7] Parsed ${parsedRows.length} rows (${validRows.length} valid, ${skippedRows} skipped).`);

  const typeNames = Array.from(new Set(validRows.map((row) => row.type)));
  const barNames = Array.from(new Set(validRows.map((row) => row.bar)));

  console.log(`[3/7] Upserting ${typeNames.length} drink types...`);
  const { data: upsertedTypes, error: typeError } = await supabase
    .from("drink_types")
    .upsert(typeNames.map((name) => ({ name })), { onConflict: "name" })
    .select("id,name");

  if (typeError) {
    throw new Error(`Failed upserting drink types: ${typeError.message}`);
  }

  console.log(`[4/7] Upserting ${barNames.length} bars...`);
  const { data: upsertedBars, error: barError } = await supabase
    .from("bars")
    .upsert(barNames.map((name) => ({ name })), { onConflict: "name" })
    .select("id,name");

  if (barError) {
    throw new Error(`Failed upserting bars: ${barError.message}`);
  }

  const typeIdByName = new Map((upsertedTypes ?? []).map((row: DrinkTypeRow) => [row.name, row.id]));
  const barIdByName = new Map((upsertedBars ?? []).map((row: BarRow) => [row.name, row.id]));

  const uniqueDrinksByKey = new Map<
    string,
    {
      drink_key: string;
      name: string;
      description: string | null;
      premium: boolean;
      bar_golf: boolean;
      type_id: string;
    }
  >();

  for (const row of validRows) {
    const typeId = typeIdByName.get(row.type);
    if (!typeId) {
      continue;
    }

    uniqueDrinksByKey.set(row.drinkId.trim(), {
      drink_key: row.drinkId.trim(),
      name: row.name,
      description: row.description || null,
      premium: isTruthy(row.premium),
      bar_golf: false,
      type_id: typeId,
    });
  }

  const drinkPayload = Array.from(uniqueDrinksByKey.values());
  console.log(`[5/7] Upserting ${drinkPayload.length} drinks...`);

  const drinkChunks = chunkArray(drinkPayload, CHUNK_SIZE);
  const allUpsertedDrinks: DrinkRow[] = [];

  for (let index = 0; index < drinkChunks.length; index += 1) {
    const chunk = drinkChunks[index];
    const { data, error } = await supabase.from("drinks").upsert(chunk, { onConflict: "drink_key" }).select("id,drink_key");

    if (error) {
      throw new Error(`Failed upserting drinks (chunk ${index + 1}/${drinkChunks.length}): ${error.message}`);
    }

    allUpsertedDrinks.push(...((data ?? []) as DrinkRow[]));
    console.log(`[5/7] Drinks chunk ${index + 1}/${drinkChunks.length} complete.`);
  }

  const drinkIdByKey = new Map(allUpsertedDrinks.map((row) => [row.drink_key, row.id]));

  const availabilityPairs = new Map<string, { drink_id: string; bar_id: string }>();
  for (const row of validRows) {
    const drinkId = drinkIdByKey.get(row.drinkId.trim());
    const barId = barIdByName.get(row.bar);

    if (!drinkId || !barId) {
      continue;
    }

    availabilityPairs.set(`${drinkId}:${barId}`, {
      drink_id: drinkId,
      bar_id: barId,
    });
  }

  const availabilityPayload = Array.from(availabilityPairs.values());
  console.log(`[6/7] Upserting ${availabilityPayload.length} availability rows...`);

  const availabilityChunks = chunkArray(availabilityPayload, CHUNK_SIZE);
  for (let index = 0; index < availabilityChunks.length; index += 1) {
    const chunk = availabilityChunks[index];
    const { error } = await supabase
      .from("drink_availability")
      .upsert(chunk, { onConflict: "drink_id,bar_id", ignoreDuplicates: true });

    if (error) {
      throw new Error(`Failed upserting availability (chunk ${index + 1}/${availabilityChunks.length}): ${error.message}`);
    }

    console.log(`[6/7] Availability chunk ${index + 1}/${availabilityChunks.length} complete.`);
  }

  console.log("[7/7] Import complete.");
  console.log(`Rows parsed: ${parsedRows.length}`);
  console.log(`Rows imported: ${validRows.length}`);
  console.log(`Rows skipped (missing required fields): ${skippedRows}`);
  console.log(`Distinct drink types: ${typeNames.length}`);
  console.log(`Distinct bars: ${barNames.length}`);
  console.log(`Distinct drinks: ${drinkPayload.length}`);
  console.log(`Availability rows: ${availabilityPayload.length}`);
}

run().catch((error) => {
  console.error("Import failed:");
  console.error(error);
  process.exitCode = 1;
});
