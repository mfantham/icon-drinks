"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { ensureProfile, requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function logDrinkAction(formData: FormData) {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  await ensureProfile(user, supabase);

  const drinkId = String(formData.get("drinkId") ?? "");
  const barId = String(formData.get("barId") ?? "").trim() || null;

  if (!isUuid(drinkId)) {
    throw new Error("Invalid drink ID.");
  }

  if (barId && !isUuid(barId)) {
    throw new Error("Invalid bar ID.");
  }

  if (barId) {
    const { data: availability, error: availabilityError } = await supabase
      .from("drink_availability")
      .select("drink_id")
      .eq("drink_id", drinkId)
      .eq("bar_id", barId)
      .limit(1)
      .maybeSingle();

    if (availabilityError) {
      throw new Error(`Failed to validate bar availability: ${availabilityError.message}`);
    }

    if (!availability) {
      throw new Error("Drink is not available at selected bar.");
    }
  }

  const { error: insertError } = await supabase.from("drink_logs").insert({
    user_id: user.id,
    drink_id: drinkId,
    bar_id: barId,
  });

  if (insertError) {
    throw new Error(`Failed to create log: ${insertError.message}`);
  }

  revalidatePath("/drinks");
  revalidatePath("/my-logs");
  revalidatePath("/dashboard");
}

export async function deleteDrinkLogAction(formData: FormData) {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  const logId = String(formData.get("logId") ?? "");
  if (!isUuid(logId)) {
    throw new Error("Invalid log ID.");
  }

  const { error } = await supabase.from("drink_logs").delete().eq("id", logId).eq("user_id", user.id);

  if (error) {
    throw new Error(`Failed to delete log: ${error.message}`);
  }

  revalidatePath("/my-logs");
  revalidatePath("/drinks");
  revalidatePath("/dashboard");
}
