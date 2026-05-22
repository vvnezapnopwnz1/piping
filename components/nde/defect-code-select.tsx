"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DEFECT_CODES } from "@/lib/engineering-references"
import { cn } from "@/lib/utils"

interface DefectCodeSelectProps {
  value?: string
  onValueChange: (code: string) => void
  className?: string
}

export function DefectCodeSelect({ value, onValueChange, className }: DefectCodeSelectProps) {
  return (
    <Select value={value ?? ""} onValueChange={onValueChange}>
      <SelectTrigger className={cn("h-7 text-xs w-[160px]", className)}>
        <SelectValue placeholder="Defect code…" />
      </SelectTrigger>
      <SelectContent>
        {DEFECT_CODES.map((dc) => (
          <SelectItem key={dc.code} value={dc.code} className="text-xs">
            <div className="flex items-center gap-2">
              <span className="font-mono font-medium">{dc.code}</span>
              <span className="text-muted-foreground">— {dc.shortName}</span>
              <span
                className={cn(
                  "text-[9px] px-1 py-0.5 rounded uppercase font-semibold ml-auto",
                  dc.severity === "Critical" && "bg-red-100 text-red-700",
                  dc.severity === "Major" && "bg-amber-100 text-amber-700",
                  dc.severity === "Minor" && "bg-slate-100 text-slate-600",
                )}
              >
                {dc.severity}
              </span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
