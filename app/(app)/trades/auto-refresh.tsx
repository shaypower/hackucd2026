"use client";
// Re-renders the server components on this page every few seconds, so phone calls appear without a reload.
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function AutoRefresh({ everyMs = 5000 }: { everyMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(() => router.refresh(), everyMs);
    return () => clearInterval(timer);
  }, [router, everyMs]);
  return null;
}
