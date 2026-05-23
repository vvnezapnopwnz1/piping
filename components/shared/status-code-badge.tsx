"use client"

import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  STATUS_CODE_TOOLTIPS,
  STATUS_CODE_TONES,
  type StatusTone,
} from "@/lib/testpack-data"
import { cn } from "@/lib/utils"

const TONE_CLASSES: Record<StatusTone, string> = {
  red: "border-red-300 bg-red-100 text-red-800",
  amber: "border-amber-300 bg-amber-100 text-amber-800",
  emerald: "border-emerald-300 bg-emerald-100 text-emerald-800",
  sky: "border-sky-300 bg-sky-100 text-sky-800",
  slate: "border-slate-300 bg-slate-100 text-slate-700",
}

interface Props {
  code: number
  label?: string
  className?: string
}

export function StatusCodeBadge({ code, label, className }: Props) {
  const tooltip = STATUS_CODE_TOOLTIPS[code] ?? `Status ${code}`
  const tone = STATUS_CODE_TONES[code] ?? "slate"
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          className={cn(
            "inline-flex items-center gap-1 font-mono text-[11px]",
            TONE_CLASSES[tone],
            className,
          )}
        >
          <span className="font-semibold">{code}</span>
          {label ? (
            <span className="font-medium normal-case">{label}</span>
          ) : null}
        </Badge>
      </TooltipTrigger>
      <TooltipContent sideOffset={6} className="max-w-xs text-xs">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  )
}
