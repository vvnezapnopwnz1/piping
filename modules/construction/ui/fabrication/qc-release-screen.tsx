"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import { describeReleaseGate } from "../../application/release-spool"
import type { FabricationReadiness } from "../../domain/quality-release"
import {
  loadObligations,
  loadPwhtRequirements,
  loadReadiness,
  loadSpoolStatus,
  loadSupports,
  recordPwhtResult,
  recordSupportProgress,
  releaseQualityRecord,
  type ObligationRow,
  type PwhtRow,
  type SpoolStatus,
  type SupportRow,
} from "../../infrastructure/supabase-construction-repository"
import { SpoolPicker } from "./spool-picker"
import { SpoolStageTimeline } from "./spool-stage-timeline"

const today = () => new Date().toISOString().slice(0, 10)

export function QcReleaseScreen({ projectId }: { projectId: string }) {
  const [spool, setSpool] = useState<SpoolStatus | null>(null)
  const [readiness, setReadiness] = useState<FabricationReadiness | null>(null)
  const [obligations, setObligations] = useState<ObligationRow[]>([])
  const [pwht, setPwht] = useState<PwhtRow[]>([])
  const [supports, setSupports] = useState<SupportRow[]>([])
  const [releasedOn, setReleasedOn] = useState(today())
  const [chartNumber, setChartNumber] = useState("")
  const [refreshToken, setRefreshToken] = useState(0)

  const reload = useCallback(async () => {
    if (!spool) return
    const client = getSupabaseBrowserClient()
    const [status, nextReadiness, nextObligations, nextPwht, nextSupports] = await Promise.all([
      loadSpoolStatus(client, spool.spoolRevisionId),
      loadReadiness(client, spool.spoolRevisionId),
      loadObligations(client, spool.spoolRevisionId),
      loadPwhtRequirements(client, spool.spoolRevisionId),
      loadSupports(client, spool.spoolRevisionId),
    ])
    setSpool(status)
    setReadiness(nextReadiness)
    setObligations(nextObligations)
    setPwht(nextPwht)
    setSupports(nextSupports)
  }, [spool])

  useEffect(() => {
    if (!spool) return
    void reload().catch((error: unknown) =>
      toast.error(error instanceof Error ? error.message : "The spool could not be loaded."),
    )
  }, [spool?.spoolRevisionId, refreshToken])

  const run = async (action: () => Promise<void>, success: string, failure: string) => {
    try {
      await action()
      setRefreshToken((token) => token + 1)
      toast.success(success)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : failure)
    }
  }

  const gate = readiness
    ? describeReleaseGate(readiness)
    : { allowed: false, reason: "Select a spool." }

  return (
    <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Spools</CardTitle>
        </CardHeader>
        <CardContent>
          <SpoolPicker
            projectId={projectId}
            value={spool?.spoolRevisionId ?? null}
            onChange={setSpool}
            refreshToken={refreshToken}
          />
        </CardContent>
      </Card>

      {spool ? (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {spool.isoNumber} / {spool.spoolNumber}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <SpoolStageTimeline status={spool} />
              <div className="flex flex-wrap items-end gap-2">
                <label className="text-sm">
                  Release date
                  <Input
                    type="date"
                    value={releasedOn}
                    onChange={(event) => setReleasedOn(event.target.value)}
                  />
                </label>
                <Button
                  type="button"
                  disabled={!gate.allowed || spool.dates.qc_release !== null}
                  onClick={() =>
                    void run(
                      () =>
                        releaseQualityRecord(
                          getSupabaseBrowserClient(),
                          spool.spoolRevisionId,
                          releasedOn,
                          null,
                          crypto.randomUUID(),
                        ),
                      "The spool is QC released.",
                      "The QC release could not be recorded.",
                    )
                  }
                >
                  QC release spool
                </Button>
              </div>
              {gate.reason ? <p className="text-sm text-destructive">{gate.reason}</p> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Supports</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Support</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Installed</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supports.map((support) => (
                    <TableRow key={support.supportRevisionId}>
                      <TableCell className="font-mono text-xs">{support.supportNumber}</TableCell>
                      <TableCell>{support.supportType ?? "—"}</TableCell>
                      <TableCell>{support.quantity}</TableCell>
                      <TableCell>{support.installedOn ?? "—"}</TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={support.installedOn !== null}
                          onClick={() =>
                            void run(
                              () =>
                                recordSupportProgress(
                                  getSupabaseBrowserClient(),
                                  support.supportRevisionId,
                                  releasedOn,
                                  crypto.randomUUID(),
                                ),
                              "Support installation recorded.",
                              "The support could not be recorded.",
                            )
                          }
                        >
                          Mark installed
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
              <CardTitle>NDE obligations</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Joint</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Cycle</TableHead>
                    <TableHead>Coverage</TableHead>
                    <TableHead>Selection</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {obligations.map((obligation) => (
                    <TableRow key={obligation.id}>
                      <TableCell className="font-mono text-xs">{obligation.weldNumber}</TableCell>
                      <TableCell className="uppercase">{obligation.method}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {obligation.cycleKind === "original"
                            ? "Original"
                            : `${obligation.cycleKind} (${obligation.cycleKind === "repair" ? "R" : "T"}${obligation.cycleOrdinal})`}
                        </Badge>
                      </TableCell>
                      <TableCell>{obligation.requiredCoverage}%</TableCell>
                      <TableCell>{obligation.selectionMode}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{obligation.disposition}</Badge>
                      </TableCell>
                      <TableCell>
                        <Link href="/nde">
                          <Button type="button" size="sm" variant="outline">
                            Manage in NDE
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p className="mt-2 text-xs text-muted-foreground">
                NDE obligations are managed through NDE inspection batches.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>PWHT</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <label className="block text-sm">
                Chart number
                <Input
                  value={chartNumber}
                  onChange={(event) => setChartNumber(event.target.value)}
                  placeholder="Chart number from the PWHT record"
                />
              </label>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Joint</TableHead>
                    <TableHead>Threshold</TableHead>
                    <TableHead>Accepted</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pwht.map((requirement) => (
                    <TableRow key={requirement.id}>
                      <TableCell className="font-mono text-xs">{requirement.weldNumber}</TableCell>
                      <TableCell>{requirement.thresholdMm ?? "any"}</TableCell>
                      <TableCell>{requirement.acceptedOn ?? "—"}</TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={requirement.acceptedOn !== null || chartNumber.trim() === ""}
                          onClick={() =>
                            void run(
                              () =>
                                recordPwhtResult(
                                  getSupabaseBrowserClient(),
                                  requirement.id,
                                  chartNumber,
                                  releasedOn,
                                  "accepted",
                                  crypto.randomUUID(),
                                ),
                              "PWHT result recorded.",
                              "The PWHT result could not be recorded.",
                            )
                          }
                        >
                          Record accepted
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Select a spool to review its QC release.</p>
      )}
    </div>
  )
}
