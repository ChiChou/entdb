import { cn } from "@/lib/utils";

/**
 * Small amber "Beta" pill shown next to pre-release firmware versions.
 * Beta builds are surfaced by the `beta` flag in each group's list.json.
 */
export function BetaBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-none tracking-wide",
        "border-amber-400/50 bg-amber-50 text-amber-700",
        "dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-300",
        className,
      )}
    >
      Beta
    </span>
  );
}
