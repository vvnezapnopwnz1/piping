"use client"

import { Badge } from "@/components/ui/badge"

export function ActiveSpoolChip({ isActive }: { isActive: boolean }) {
  return (
    <Badge
      className={
        isActive
          ? "bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]"
          : "bg-slate-100 text-slate-600 border-slate-300 text-[10px]"
      }
    >
      {isActive ? "Active" : "Inactive"}
    </Badge>
  )
}
