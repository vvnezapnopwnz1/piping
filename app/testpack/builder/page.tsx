"use client"

import { useMemo, useState } from "react"
import { Plus, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useTestpackStore } from "@/store/testpack-store"
import { useScopeLock } from "@/lib/scope-lock"
import { TestpackBuilderSheet } from "@/components/testpack/testpack-builder-sheet"
import type { TestPackRecord } from "@/lib/testpack-seed"

export default function TestpackBuilderPage() {
  const tps = useTestpackStore((s) => s.testPacks)
  const isos = useTestpackStore((s) => s.isos)
  const scope = useScopeLock()
  const [sheetMode, setSheetMode] = useState<
    { kind: "create" } | { kind: "edit"; tp: TestPackRecord } | null
  >(null)

  const unassignedIsos = useMemo(() => {
    const assigned = new Set<string>()
    tps.forEach((tp) => tp.isoIds.forEach((id) => assigned.add(id)))
    return isos.filter((iso) => !assigned.has(iso.id))
  }, [tps, isos])

  const scopedTps = tps.filter((tp) => scope.isInScope(tp.pdsAreaCode))

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Test Pack Builder
          </h1>
          <p className="text-sm text-muted-foreground">
            Manually assemble test packs from your unassigned ISO pool.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {scope.active ? (
            <Badge variant="outline" className="text-xs">
              Scope: {scope.subCode}
            </Badge>
          ) : null}
          <Button onClick={() => setSheetMode({ kind: "create" })}>
            <Plus className="mr-2 h-4 w-4" /> New Test Pack
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Existing Test Packs ({scopedTps.length})
          </CardTitle>
          <CardDescription>
            Click Edit to adjust general info or ISO assignment.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>TP No</TableHead>
                <TableHead>System</TableHead>
                <TableHead>Subsystem</TableHead>
                <TableHead>ISOs</TableHead>
                <TableHead>Rev</TableHead>
                <TableHead>Medium</TableHead>
                <TableHead>Planned</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scopedTps.map((tp) => (
                <TableRow key={tp.id}>
                  <TableCell className="font-mono text-sm font-semibold text-sky-700">
                    {tp.id}
                  </TableCell>
                  <TableCell className="text-sm">{tp.system}</TableCell>
                  <TableCell className="text-sm">{tp.subsystem}</TableCell>
                  <TableCell className="text-sm">{tp.isoIds.length}</TableCell>
                  <TableCell className="text-sm">{tp.rev}</TableCell>
                  <TableCell className="text-sm">{tp.testMedium}</TableCell>
                  <TableCell className="text-sm">
                    {tp.testPlannedDate ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSheetMode({ kind: "edit", tp })}
                    >
                      <Pencil className="mr-1 h-3 w-3" /> Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Unassigned ISOs ({unassignedIsos.length})
          </CardTitle>
          <CardDescription>
            ISOs not yet linked to any test pack.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ISO ID</TableHead>
                <TableHead>Welds done</TableHead>
                <TableHead>Spools supported</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {unassignedIsos.map((iso) => (
                <TableRow key={iso.id}>
                  <TableCell className="font-mono text-sm">{iso.id}</TableCell>
                  <TableCell className="text-sm">
                    {iso.allWeldsWelded ? "Yes" : "No"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {iso.spoolsSupported ? "Yes" : "No"}
                  </TableCell>
                </TableRow>
              ))}
              {unassignedIsos.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="py-8 text-center text-sm text-slate-400"
                  >
                    All ISOs are assigned to a test pack
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {sheetMode ? (
        <TestpackBuilderSheet
          open
          onClose={() => setSheetMode(null)}
          mode={sheetMode}
        />
      ) : null}
    </div>
  )
}
