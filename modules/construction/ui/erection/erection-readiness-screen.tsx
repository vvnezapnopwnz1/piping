"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  currentErectionStageLabel,
  describeRftShortfall,
} from "../../application/describe-erection-readiness"
import { useErectionReadiness } from "./use-erection-readiness"

/**
 * The read-only face of `spool_erection_readiness`, behind the erection dashboard, Ready For
 * Test and Field QC Release. There is no release action on purpose: RFT is a projection of
 * stage, weld, support, NDE and PWHT evidence, and no screen may set it.
 */
export function ErectionReadinessScreen({
  title,
  description,
  note,
}: {
  title: string
  description: string
  /** An extra sentence for routes whose own module is not built yet. */
  note?: string
}) {
  const { projectId, isLoading, loadFailed, rows, canView } = useErectionReadiness()

  if (!projectId) {
    return (
      <p className="text-muted-foreground text-sm">Select a project to see erection progress.</p>
    )
  }
  if (!canView) {
    return (
      <p className="text-muted-foreground text-sm">
        Viewing erection progress needs the erection.view capability on this project.
      </p>
    )
  }

  const readyCount = rows.filter((row) => row.isRft).length

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{description}</p>
        {note ? <p className="text-muted-foreground mt-2 text-sm">{note}</p> : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Field spool readiness
            {isLoading || loadFailed ? null : (
              <span className="text-muted-foreground ml-2 text-sm font-normal">
                {readyCount}/{rows.length} ready for test
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Loading field spool readiness…</p>
          ) : loadFailed ? (
            <p className="text-destructive text-sm">
              Field spool readiness could not be loaded, so nothing is listed. Reload the page,
              and report this if it persists.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ISO</TableHead>
                  <TableHead>Spool</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead>Field welds</TableHead>
                  <TableHead>Field supports</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>RFT</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const shortfall = describeRftShortfall(row)
                  return (
                    <TableRow key={row.spoolRevisionId}>
                      <TableCell className="font-mono text-xs">{row.isoNumber}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {row.spoolNumber}
                        <span className="text-muted-foreground ml-2">{row.revisionNumber}</span>
                      </TableCell>
                      <TableCell>
                        {row.materialLineChecked}/{row.materialLineTotal}
                      </TableCell>
                      <TableCell>
                        {row.fieldWeldComplete}/{row.fieldWeldTotal}
                      </TableCell>
                      <TableCell>
                        {row.fieldSupportRecorded}/{row.fieldSupportTotal}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{currentErectionStageLabel(row)}</Badge>
                      </TableCell>
                      <TableCell>
                        {row.isRft ? (
                          <span>
                            Ready
                            {row.rftOn ? (
                              <span className="ml-2 font-mono text-xs">
                                {row.rftOn.slice(0, 10)}
                              </span>
                            ) : null}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">{shortfall}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-muted-foreground text-sm">
                      No accepted field spool is available on this project.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <p className="text-muted-foreground text-sm">
        Ready For Test is derived, never stored: it opens once Welded / Bolted and Supported are
        recorded and no NDE obligation or PWHT requirement is left open. The material columns
        count evidence from either phase, because a spool revision carries one material check.
      </p>
    </div>
  )
}
