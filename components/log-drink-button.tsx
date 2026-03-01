"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const COOLDOWN_MS = 5_000;

export function LogDrinkButton({ className }: { className?: string }) {
  const { pending } = useFormStatus();
  const [isCoolingDown, setIsCoolingDown] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  function startCooldown() {
    if (pending || isCoolingDown) {
      return;
    }

    setIsCoolingDown(true);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setIsCoolingDown(false);
      timeoutRef.current = null;
    }, COOLDOWN_MS);
  }

  const isDisabled = pending || isCoolingDown;

  return (
    <Button
      type="submit"
      size="sm"
      disabled={isDisabled}
      onClick={startCooldown}
      className={cn(
        "transition-all duration-300",
        isCoolingDown ? "bg-emerald-600 text-white hover:bg-emerald-600" : null,
        className
      )}
    >
      <span className={cn(isCoolingDown ? "motion-safe:animate-[ping_280ms_ease-out_1]" : null)}>
        {pending ? "Logging..." : isCoolingDown ? "Logged!" : "Log it"}
      </span>
    </Button>
  );
}
