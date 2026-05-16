"use client"

import { JOINT_CATEGORIES } from "@/lib/engineering-references"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const CODE_STYLES: Record<string, { bg: string; text: string; border: string; pillBg: string }> = {
  X: {
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
    pillBg: "bg-red-100 text-red-700 border-red-200",
  },
  Y: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    pillBg: "bg-amber-100 text-amber-700 border-amber-200",
  },
  Z: {
    bg: "bg-slate-50",
    text: "text-slate-700",
    border: "border-slate-200",
    pillBg: "bg-slate-100 text-slate-700 border-slate-200",
  },
}

export function JointCategoriesTab() {
  return (
    <div className="space-y-4">
      {/* Header note */}
      <p className="text-sm text-slate-500">
        Punch item categories — §3.13. These categories determine when an item
        must be resolved relative to hydrotest.
      </p>

      {/* KPI strip */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs">
          <span className="text-slate-500">Categories:</span>
          <span className="font-semibold text-slate-900">3</span>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {JOINT_CATEGORIES.map((cat) => {
          const style = CODE_STYLES[cat.code]
          return (
            <div
              key={cat.code}
              className={cn(
                "rounded-xl border p-5 space-y-4",
                style.bg,
                style.border
              )}
            >
              {/* Big code */}
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "text-4xl font-bold tracking-tight",
                    style.text
                  )}
                >
                  {cat.code}
                </span>
              </div>

              {/* Name */}
              <h3 className={cn("text-lg font-semibold", style.text)}>
                {cat.name}
              </h3>

              {/* Description */}
              <p className="text-sm text-slate-700 leading-relaxed">
                {cat.description}
              </p>

              {/* Examples */}
              <div>
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  Examples
                </p>
                <ul className="list-disc list-inside space-y-1">
                  {cat.examples.map((ex) => (
                    <li key={ex} className="text-xs text-slate-600">
                      {ex}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Resolution required */}
              <div>
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Resolution required
                </p>
                <p className="text-xs text-slate-700">{cat.resolutionRequired}</p>
              </div>

              {/* Enforced in */}
              <div>
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  Enforced in
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {cat.enforcedIn.map((screen) => (
                    <Badge
                      key={screen}
                      variant="outline"
                      className={cn("text-[10px]", style.pillBg)}
                    >
                      {screen}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer note */}
      <p className="text-sm text-slate-500 pt-2">
        In this demo, Category X blocks the Blinding eligibility gate; Category
        Y appears in Reinstatement Preparation only after testingDoneDate is
        set; Category Z appears only after preCommDate is set.
      </p>
    </div>
  )
}
