"use client"

import { useMemo } from "react"
import { format } from "date-fns"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { useBatchesStore } from "@/store"
import { DEFECT_CODES } from "@/lib/engineering-references"

interface JointHistoryPanelProps {
  jointNo: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface HistoryRow {
  batchNo: string
  batchId: string
  jointNo: string
  result: string
  defectCode?: string
  defectLocation?: string
  inspector?: string
  date?: string
  category?: string
  isTracer?: boolean
  remarks?: string
}

export function JointHistoryPanel({ jointNo, open, onOpenChange }: JointHistoryPanelProps) {
  const batches = useBatchesStore((s) => s.batches)

  const rows: HistoryRow[] = useMemo(() => {
    if (!jointNo) return []
    const baseJoint = jointNo.replace(/-R\d+$/, "")
    const matcher = (jn: string) => jn === baseJoint || jn.startsWith(`${baseJoint}-R`)
    const out: HistoryRow[] = []
    for (const b of batches) {
      for (const w of b.welds) {
        if (matcher(w.jointNo)) {
          out.push({
            batchNo: b.batchNo,
            batchId: b.id,
            jointNo: w.jointNo,
            result: w.result,
            defectCode: w.defectCode,
            defectLocation: w.defectLocation,
            inspector: w.inspector,
            date: w.date,
            category: w.category,
            isTracer: w.isTracer,
            remarks: w.remarks,
          })
        }
      }
    }
    return out.sort((a, b) => a.jointNo.localeCompare(b.jointNo))
  }, [batches, jointNo])

  if (!jointNo) return null

  const baseJoint = jointNo.replace(/-R\d+$/, "")

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-[560px]">
        <SheetHeader className="border-b px-6 py-5">
          <SheetTitle className="font-mono text-lg">{baseJoint} — Examination History</SheetTitle>
          <SheetDescription>
            All NDE cycles for this joint across rework iterations
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {rows.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">
              No examination history found for {baseJoint}
            </div>
          ) : (
            <div className="space-y-3">
              {rows.map((row, idx) => {
                const defectDef = DEFECT_CODES.find((d) => d.code === row.defectCode)
                const isOriginal = row.jointNo === baseJoint
                return (
                  <div
                    key={`${row.batchId}-${row.jointNo}-${idx}`}
                    className="rounded-md border border-slate-200 bg-white p-3"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-mono text-sm font-semibold">{row.jointNo}</span>
                      {isOriginal ? (
                        <Badge variant="outline" className="text-[10px]">
                          Original
                        </Badge>
                      ) : (
                        <Badge className="bg-orange-100 text-orange-700 text-[10px]">
                          Rework cycle
                        </Badge>
                      )}
                      {row.category === "NDE100" && (
                        <Badge className="bg-red-100 text-red-700 text-[10px]">NDE100</Badge>
                      )}
                      {row.isTracer && (
                        <Badge className="bg-violet-100 text-violet-700 text-[10px]">Tracer</Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                      <div className="text-muted-foreground">Batch</div>
                      <div className="font-mono">{row.batchNo}</div>

                      <div className="text-muted-foreground">Result</div>
                      <div>
                        <Badge
                          className={
                            row.result === "Accepted"
                              ? "bg-emerald-100 text-emerald-700 text-[10px]"
                              : row.result === "Rejected"
                                ? "bg-red-100 text-red-700 text-[10px]"
                                : "bg-slate-100 text-slate-600 text-[10px]"
                          }
                        >
                          {row.result}
                        </Badge>
                      </div>

                      {row.defectCode && (
                        <>
                          <div className="text-muted-foreground">Defect</div>
                          <div className="font-mono">
                            {row.defectCode} — {defectDef?.shortName ?? ""}
                          </div>
                        </>
                      )}
                      {row.defectLocation && (
                        <>
                          <div className="text-muted-foreground">Location</div>
                          <div>{row.defectLocation}</div>
                        </>
                      )}

                      {row.inspector && (
                        <>
                          <div className="text-muted-foreground">Inspector</div>
                          <div>{row.inspector}</div>
                        </>
                      )}
                      {row.date && (
                        <>
                          <div className="text-muted-foreground">Date</div>
                          <div>{format(new Date(row.date), "dd MMM yyyy")}</div>
                        </>
                      )}
                    </div>
                    {row.remarks && (
                      <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-600">
                        {row.remarks}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
