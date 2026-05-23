"use client"

import { useMemo, useState } from "react"
import { Plus, Trash2, Download, Search } from "lucide-react"
import * as XLSX from "xlsx"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { useScopeLock } from "@/lib/scope-lock"
import { usePmWriteLock } from "@/lib/pm-write-lock"
import { PmWriteLockBanner } from "@/components/pm-write-lock-banner"
import { useSpoolTrackingStore } from "@/store/spool-tracking-store"
import { deriveBarcode, deriveCurrentLocation, groupEventsBySpool } from "@/lib/spool-tracking"
import { useTrackingSpools } from "./use-tracking-rows"

export function TrackingBarcodeBasketView() {
  const [search, setSearch] = useState("")
  const [basket, setBasket] = useState<string[]>([])
  const spools = useTrackingSpools()
  const events = useSpoolTrackingStore((s) => s.events)
  const scope = useScopeLock()
  const { locked: pmLocked } = usePmWriteLock()

  const available = useMemo(() => {
    const q = search.trim().toLowerCase()
    return spools
      .filter((s) => {
        if (!scope.isInScope(s.pdsAreaCode)) return false
        if (basket.includes(s.spoolNo)) return false
        if (!q) return true
        return (
          s.spoolNo.toLowerCase().includes(q) ||
          s.isoNo.toLowerCase().includes(q) ||
          deriveBarcode(s.spoolNo).toLowerCase().includes(q)
        )
      })
      .slice(0, 50)
  }, [spools, search, basket, scope])

  function exportExcel() {
    if (basket.length === 0) return
    const eventsBySpool = groupEventsBySpool(events)
    const sheetRows = basket.map((spoolNo) => {
      const s = spools.find((sp) => sp.spoolNo === spoolNo)
      const cur = deriveCurrentLocation(eventsBySpool.get(spoolNo) ?? [])
      return {
        "Spool No": spoolNo,
        "ISO No": s?.isoNo ?? "",
        Barcode: deriveBarcode(spoolNo),
        "Current Location": cur?.location ?? "",
        Material: s?.material ?? "",
      }
    })
    const ws = XLSX.utils.json_to_sheet(sheetRows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Barcodes")
    XLSX.writeFile(wb, `barcodes-${new Date().toISOString().slice(0, 10)}.xlsx`)
    toast.success(`Exported ${basket.length} barcodes to Excel`)
  }

  return (
    <div className="space-y-4">
      <PmWriteLockBanner />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Available spools</CardTitle>
            <CardDescription>Search by spool no or ISO no</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="h-9 pl-9"
              />
            </div>
            <div className="max-h-[480px] space-y-1 overflow-y-auto">
              {available.map((s) => (
                <button
                  key={s.spoolNo}
                  type="button"
                  onClick={() => setBasket((b) => [...b, s.spoolNo])}
                  disabled={pmLocked}
                  className="flex w-full items-center justify-between rounded border border-slate-200 bg-white px-3 py-2 text-left text-sm hover:border-sky-300 hover:bg-sky-50 disabled:opacity-50"
                >
                  <span className="font-mono text-[13px] text-sky-700">{s.spoolNo}</span>
                  <Plus className="h-4 w-4 text-slate-500" />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="gap-2 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">
                Basket ({basket.length})
              </CardTitle>
              <Button
                onClick={exportExcel}
                disabled={basket.length === 0 || pmLocked}
                className="gap-2"
                size="sm"
              >
                <Download className="h-4 w-4" /> Export to Excel
              </Button>
            </div>
            <CardDescription>
              Selected spools → Excel for external Zebra printing (CC-13)
            </CardDescription>
          </CardHeader>
          <CardContent className="max-h-[510px] space-y-1 overflow-y-auto">
            {basket.length === 0 ? (
              <p className="text-sm text-slate-500">Click spools on the left to add them.</p>
            ) : (
              basket.map((spoolNo) => (
                <div
                  key={spoolNo}
                  className="flex items-center justify-between rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                >
                  <span className="font-mono text-[13px] text-slate-800">{spoolNo}</span>
                  <button
                    type="button"
                    onClick={() => setBasket((b) => b.filter((x) => x !== spoolNo))}
                    disabled={pmLocked}
                    className="text-slate-400 hover:text-red-600 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
