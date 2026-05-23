"use client"

import { useRef, useState } from "react"
import * as XLSX from "xlsx"
import { Download, Upload } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export interface ImportPreviewRow {
  _row: number
  _valid: boolean
  _errors: string
  [column: string]: string | number | boolean
}

type ImportDryRunCardProps = {
  title: string
  templatePath: string
  requiredColumns: string[]
  parseRow: (
    raw: Record<string, unknown>,
    rowNum: number,
    existingKeys: Set<string>
  ) => ImportPreviewRow
  onConfirm: (rows: ImportPreviewRow[]) => number
}

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, " ")
}

export function ImportDryRunCard({
  title,
  templatePath,
  requiredColumns,
  parseRow,
  onConfirm,
}: ImportDryRunCardProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [preview, setPreview] = useState<ImportPreviewRow[]>([])
  const [missingCols, setMissingCols] = useState<string[]>([])

  const handleFile = async (file: File) => {
    const buf = await file.arrayBuffer()
    const wb = XLSX.read(buf, { type: "array" })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
      defval: "",
    })
    if (!json.length) {
      toast.error("Empty spreadsheet")
      return
    }
    const headers = Object.keys(json[0]).map(normalizeHeader)
    const requiredNorm = requiredColumns.map(normalizeHeader)
    const missing = requiredNorm.filter((c) => !headers.includes(c))
    setMissingCols(missing)
    if (missing.length) {
      toast.error(`Missing columns: ${missing.join(", ")}`)
      return
    }

    const keySet = new Set<string>()
    const rows = json.map((raw, i) => {
      const normalized: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(raw)) {
        normalized[normalizeHeader(k)] = v
      }
      const mapped: Record<string, unknown> = {}
      for (const col of requiredColumns) {
        mapped[col] = normalized[normalizeHeader(col)] ?? ""
      }
      return parseRow(mapped, i + 2, keySet)
    })
    setPreview(rows)
    setSheetOpen(true)
  }

  const validCount = preview.filter((r) => r._valid).length

  const handleConfirm = () => {
    const n = onConfirm(preview.filter((r) => r._valid))
    toast.success(`Imported ${n} rows`)
    setSheetOpen(false)
    setPreview([])
    if (inputRef.current) inputRef.current.value = ""
  }

  const displayCols = requiredColumns

  return (
    <>
      <Card className="border-slate-200">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">{title}</CardTitle>
              <CardDescription>
                Upload .xlsx for dry-run validation, then confirm import.
              </CardDescription>
            </div>
            <Badge variant="outline" className="shrink-0 text-[10px] text-emerald-700">
              Dry-run enabled
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" asChild className="h-8">
              <a href={templatePath} download>
                <Download className="mr-2 h-3.5 w-3.5" />
                Download template
              </a>
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void handleFile(f)
              }}
            />
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="mr-2 h-3.5 w-3.5" />
              Select file
            </Button>
          </div>
          {missingCols.length > 0 ? (
            <p className="text-xs text-red-600">
              Missing: {missingCols.join(", ")}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Import preview — {title}</SheetTitle>
            <SheetDescription>
              {validCount} of {preview.length} rows valid
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4 max-h-[60vh] overflow-auto rounded border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Row</TableHead>
                  {displayCols.map((c) => (
                    <TableHead key={c} className="text-xs">
                      {c}
                    </TableHead>
                  ))}
                  <TableHead className="text-xs">Validation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.map((row) => (
                  <TableRow
                    key={row._row}
                    className={row._valid ? "" : "bg-red-50/80"}
                  >
                    <TableCell className="text-xs">{row._row}</TableCell>
                    {displayCols.map((c) => (
                      <TableCell key={c} className="text-xs">
                        {String(row[c] ?? "")}
                      </TableCell>
                    ))}
                    <TableCell className="text-xs text-red-700">
                      {row._errors || "OK"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <SheetFooter className="mt-4">
            <Button
              onClick={handleConfirm}
              disabled={validCount === 0}
            >
              Confirm import ({validCount})
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  )
}
