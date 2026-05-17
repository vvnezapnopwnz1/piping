"use client"

import { useSpoolingStore } from "@/store/spooling-store"
import { SpoolingImportPanel } from "@/components/spooling/spooling-import-panel"
import { SpoolingValidationTable } from "@/components/spooling/spooling-validation-table"
import { SpoolingRevisionPanel } from "@/components/spooling/spooling-revision-panel"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export function SpoolingView() {
  const latest = useSpoolingStore((s) => s.latestRows)
  const history = useSpoolingStore((s) => s.historyRows)

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
        Spooling is the source-of-truth module for weld/ISO/flange seed data in this demo shell.
      </div>

      <Tabs defaultValue="import" className="space-y-3">
        <TabsList>
          <TabsTrigger value="import">Import Spooling Data</TabsTrigger>
          <TabsTrigger value="latest">Browse Latest</TabsTrigger>
          <TabsTrigger value="history">Browse History</TabsTrigger>
          <TabsTrigger value="revision">Manual Revision Management</TabsTrigger>
          <TabsTrigger value="issues">Validation Issues</TabsTrigger>
        </TabsList>

        <TabsContent value="import"><SpoolingImportPanel /></TabsContent>

        <TabsContent value="latest">
          <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
            <div className="text-sm font-semibold">Browse Latest</div>
            <div className="rounded-md border">
              <Table>
                <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>ISO</TableHead><TableHead>Rev</TableHead><TableHead>PDS Area</TableHead><TableHead>Service</TableHead><TableHead>Weld Type</TableHead><TableHead>Thickness</TableHead><TableHead>NDE Matrix</TableHead><TableHead>WPS</TableHead></TableRow></TableHeader>
                <TableBody>
                  {latest.length === 0 ? (
                    <TableRow><TableCell colSpan={9} className="text-center text-xs text-slate-500 py-6">No latest data. Load demo import first.</TableCell></TableRow>
                  ) : latest.map((r) => (
                    <TableRow key={r.id}><TableCell className="font-mono text-xs">{r.id}</TableCell><TableCell className="text-xs">{r.isoNo}</TableCell><TableCell className="text-xs">{r.rev}</TableCell><TableCell className="text-xs">{r.pdsArea}</TableCell><TableCell className="text-xs">{r.serviceClass}</TableCell><TableCell className="text-xs">{r.weldType}</TableCell><TableCell className="text-xs">{r.thickness}</TableCell><TableCell className="text-xs">{r.ndeMatrix || "—"}</TableCell><TableCell className="text-xs">{r.wps || "—"}</TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
            <div className="text-sm font-semibold">Browse History</div>
            <div className="text-xs text-slate-600">Previous imports and rows not accepted due to validation errors.</div>
            <div className="rounded-md border">
              <Table>
                <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>ISO</TableHead><TableHead>Rev</TableHead><TableHead>PDS Area</TableHead><TableHead>Service</TableHead></TableRow></TableHeader>
                <TableBody>
                  {history.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-xs text-slate-500 py-6">No historical rows</TableCell></TableRow>
                  ) : history.map((r) => (
                    <TableRow key={r.id}><TableCell className="font-mono text-xs">{r.id}</TableCell><TableCell className="text-xs">{r.isoNo}</TableCell><TableCell className="text-xs">{r.rev}</TableCell><TableCell className="text-xs">{r.pdsArea}</TableCell><TableCell className="text-xs">{r.serviceClass}</TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="revision"><SpoolingRevisionPanel /></TabsContent>
        <TabsContent value="issues"><SpoolingValidationTable /></TabsContent>
      </Tabs>
    </div>
  )
}
