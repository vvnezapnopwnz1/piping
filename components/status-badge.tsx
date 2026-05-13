import { cn } from "@/lib/utils"
import type { WeldStatus } from "@/lib/weld-data"

const STATUS_CONFIG: Record<WeldStatus, { label: string; className: string }> = {
  "Not Started": {
    label: "Not Started",
    className: "bg-slate-100 text-slate-700 border border-slate-300",
  },
  "In Progress": {
    label: "In Progress",
    className: "bg-amber-100 text-amber-800 border border-amber-300",
  },
  Completed: {
    label: "Completed",
    className: "bg-emerald-100 text-emerald-800 border border-emerald-300",
  },
  Rejected: {
    label: "Rejected",
    className: "bg-red-100 text-red-800 border border-red-300",
  },
  Rework: {
    label: "Rework",
    className: "bg-orange-100 text-orange-800 border border-orange-300",
  },
  "On Hold": {
    label: "On Hold",
    className: "bg-slate-200 text-slate-700 border border-slate-300",
  },
}

interface StatusBadgeProps {
  status: WeldStatus
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status]

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
  )
}
