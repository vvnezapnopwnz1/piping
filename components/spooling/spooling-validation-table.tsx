"use client"

import { useSpoolingStore } from "@/store/spooling-store"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export function SpoolingValidationTable() {
  const issues = useSpoolingStore((s) => s.issues)

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
      <div className="text-sm font-semibold">Validation Issues</div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Severity</TableHead>
              <TableHead>Rule</TableHead>
              <TableHead>Row</TableHead>
              <TableHead>Message</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {issues.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center text-xs text-slate-500 py-6">No validation issues</TableCell></TableRow>
            ) : issues.map((i) => (
              <TableRow key={i.id}>
                <TableCell className="text-xs">{i.severity}</TableCell>
                <TableCell className="text-xs">{i.rule}</TableCell>
                <TableCell className="font-mono text-xs">{i.rowId}</TableCell>
                <TableCell className="text-xs">{i.message}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
