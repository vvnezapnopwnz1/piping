"use client"

import { Upload } from "lucide-react"
import { toast } from "sonner"

import { useSpoolingStore } from "@/store/spooling-store"
import { Button } from "@/components/ui/button"

export function SpoolingImportPanel() {
  const loadDemoImport = useSpoolingStore((s) => s.loadDemoImport)
  const acceptCleanRows = useSpoolingStore((s) => s.acceptCleanRows)

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
      <div className="text-sm font-semibold">Import Spooling Data</div>
      <div className="text-xs text-slate-600">
        Demo import shell for §6: upload/preview/validate/accept clean rows.
      </div>
      <div className="flex gap-2">
        <Button className="h-8 gap-1" onClick={() => { loadDemoImport(); toast.success("Demo spooling import loaded") }}>
          <Upload className="h-3.5 w-3.5" />
          Load demo import
        </Button>
        <Button variant="outline" className="h-8" onClick={() => { acceptCleanRows(); toast.success("Clean rows accepted") }}>
          Accept clean rows
        </Button>
        <Button variant="ghost" className="h-8" onClick={() => toast.info("Mock error file exported")}>Export error file</Button>
      </div>
    </div>
  )
}
