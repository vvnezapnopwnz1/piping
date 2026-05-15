import { cn } from "@/lib/utils";
import type { ErectionStatus } from "@/lib/erection-weld-data";

const ERECTION_STATUS_CONFIG: Record<
  ErectionStatus,
  { label: string; className: string }
> = {
  "To Site": {
    label: "To Site",
    className: "bg-sky-100 text-sky-800 border border-sky-300",
  },
  Erected: {
    label: "Erected",
    className: "bg-amber-100 text-amber-800 border border-amber-300",
  },
  Welded: {
    label: "Welded",
    className: "bg-emerald-100 text-emerald-800 border border-emerald-300",
  },
  Bolted: {
    label: "Bolted",
    className: "bg-violet-100 text-violet-800 border border-violet-300",
  },
  Supported: {
    label: "Supported",
    className: "bg-cyan-100 text-cyan-800 border border-cyan-300",
  },
  RFT: {
    label: "RFT",
    className: "bg-emerald-200 text-emerald-900 border border-emerald-400",
  },
  "Not Started": {
    label: "Not Started",
    className: "bg-slate-100 text-slate-700 border border-slate-300",
  },
};

interface ErectionStatusBadgeProps {
  status: ErectionStatus;
  className?: string;
}

export function ErectionStatusBadge({
  status,
  className,
}: ErectionStatusBadgeProps) {
  const config = ERECTION_STATUS_CONFIG[status];

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap",
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  );
}
