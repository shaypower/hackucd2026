// Check result as icon + word. Never colour alone.
import { Check, TriangleAlert, X } from "lucide-react";
import type { CheckStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const LABEL: Record<CheckStatus, string> = { pass: "Passed", warn: "Needs review", fail: "Failed" };
const ICON = { pass: Check, warn: TriangleAlert, fail: X } satisfies Record<CheckStatus, unknown>;
const STYLE: Record<CheckStatus, string> = {
  pass: "text-pass",
  warn: "bg-warn-wash text-warn px-2",
  fail: "bg-fail-wash text-fail px-2",
};

export function StatusMark({ status, label, className }: { status: CheckStatus; label?: string; className?: string }) {
  const Icon = ICON[status];
  return (
    <span className={cn("inline-flex h-6 items-center gap-1.5 rounded-md text-[12.5px] font-semibold whitespace-nowrap", STYLE[status], className)}>
      <Icon aria-hidden="true" className="size-3.5" strokeWidth={2.2} />
      {label ?? LABEL[status]}
    </span>
  );
}
