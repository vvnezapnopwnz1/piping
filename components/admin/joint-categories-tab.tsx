"use client"

import { useState } from "react"
import { Pencil } from "lucide-react"

import { EditJointCategoryDialog } from "@/components/admin/edit-joint-category-dialog"
import { useAdminStore, type JointCategoryRecord } from "@/store/admin-store"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const CODE_STYLES: Record<
  string,
  { bg: string; text: string; border: string; pillBg: string }
> = {
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
  const jointCategories = useAdminStore((s) => s.jointCategories)
  const [editing, setEditing] = useState<JointCategoryRecord | null>(null)

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Punch item categories — §3.13. X / Y / Z codes are fixed; edit
        description and examples per project.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs">
          <span className="text-slate-500">Categories:</span>
          <span className="font-semibold text-slate-900">
            {jointCategories.length}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {jointCategories.map((cat) => {
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
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "text-4xl font-bold tracking-tight",
                    style.text
                  )}
                >
                  {cat.code}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 text-xs"
                  onClick={() => setEditing(cat)}
                >
                  <Pencil className="h-3 w-3" />
                  Edit
                </Button>
              </div>

              <h3 className={cn("text-lg font-semibold", style.text)}>
                {cat.name}
              </h3>

              <p className="text-sm text-slate-700 leading-relaxed">
                {cat.description}
              </p>

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

              <div>
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Resolution required
                </p>
                <p className="text-xs text-slate-700">
                  {cat.resolutionRequired}
                </p>
              </div>

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

      <EditJointCategoryDialog
        category={editing}
        open={!!editing}
        onOpenChange={(next) => {
          if (!next) setEditing(null)
        }}
      />
    </div>
  )
}
