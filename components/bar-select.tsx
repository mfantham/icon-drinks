"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type BarOption = {
  id: string;
  name: string;
};

type BarSelectProps = {
  bars: BarOption[];
  selectedBarId: string;
};

export function BarSelect({ bars, selectedBarId }: BarSelectProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function onBarChange(barId: string) {
    const nextParams = new URLSearchParams(searchParams.toString());

    if (barId) {
      nextParams.set("bar", barId);
    } else {
      nextParams.delete("bar");
    }

    const query = nextParams.toString();
    const nextUrl = query ? `${pathname}?${query}` : pathname;

    startTransition(() => {
      router.replace(nextUrl, { scroll: false });
    });
  }

  return (
    <select
      value={selectedBarId}
      onChange={(event) => onBarChange(event.target.value)}
      className="h-10 rounded-md border border-input bg-background px-3 text-sm"
      disabled={isPending}
      aria-label="Choose bar"
    >
      {bars.map((bar) => (
        <option key={bar.id} value={bar.id}>
          {bar.name}
        </option>
      ))}
    </select>
  );
}
