import { cn } from "@/lib/utils"
import type { WeldStatus } from "@/lib/weld-data"

const STATUS_CONFIG: Record<WeldStatus, { label: string; className: string }> = {
  "Not Started": {
    label: "Not Started",
    className: "bg-slate-700 text-slate-300 border border-slate-600",
  },
  "In Progress": {
    label: "In Progress",
    className: "bg-amber-900/50 text-amber-300 border border-amber-700/60",
  },
  Completed: {
    label: "Completed",
    className: "bg-emerald-900/50 text-emerald-300 border border-emerald-700/60",
  },
  Rejected: {
    label: "Rejected",
    className: "bg-red-900/50 text-red-300 border border-red-700/60",
  },
  Rework: {
    label: "Rework",
    className: "bg-orange-900/50 text-orange-300 border border-orange-700/60",
  },
  "On Hold": {
    label: "On Hold",
    className: "bg-slate-700/80 text-slate-400 border border-slate-600",
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
        className
      )}
    >
      {config.label}
    </span>
  )
}
