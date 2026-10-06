"use client"

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { AlertCircle, ArrowRight, Check, RotateCw } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/ui/status-badge"
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
import { canVisit } from "@/components/pipeqc/navigation-model"
import { useMarkInputsRecorded } from "@/components/pipeqc/unsaved-input-guard"
import { linkFrom } from "@/components/pipeqc/workspace-model"
import { useOptionalAccess } from "@/modules/access/ui/access-context"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import { describeReleaseGate } from "../../application/release-spool"
import {
  evaluateReleaseEligibility,
  type FabricationReadiness,
} from "../../domain/quality-release"
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
  type SupportRow,
} from "../../infrastructure/supabase-construction-repository"
import { releaseChecks, type ReleaseCheckId } from "./release-checks"
import { SpoolPicker } from "./spool-picker"
import { useContextSpool, type EmbeddedSpool } from "./use-context-spool"
import { SpoolStageTimeline } from "./spool-stage-timeline"
import styles from "../spool-workbench.module.css"

const today = () => new Date().toISOString().slice(0, 10)

export function QcReleaseScreen({
  projectId,
  embedded,
}: {
  projectId: string
  embedded?: EmbeddedSpool
}) {
  const [ownSpool, setOwnSpool] = useContextSpool(projectId, { enabled: !embedded })
  const spool = embedded ? embedded.spool : ownSpool
  const setSpool = embedded ? embedded.onSpoolChange : setOwnSpool
  const spoolRevisionId = spool?.spoolRevisionId ?? null

  const [readiness, setReadiness] = useState<FabricationReadiness | null>(null)
  const [obligations, setObligations] = useState<ObligationRow[]>([])
  const [pwht, setPwht] = useState<PwhtRow[]>([])
  const [supports, setSupports] = useState<SupportRow[]>([])
  const [releasedOn, setReleasedOn] = useState(today())
  const [chartNumber, setChartNumber] = useState("")
  const [evidence, setEvidence] = useState<"supports" | "nde" | "pwht">("supports")
  const [refreshToken, setRefreshToken] = useState(0)
  const [browsingSpools, setBrowsingSpools] = useState(false)

  const currentKey = spoolRevisionId ? `${spoolRevisionId}:${refreshToken}` : null
  const [loadedKey, setLoadedKey] = useState<string | null>(null)
  const [failedKey, setFailedKey] = useState<string | null>(null)
  const loadState: "loading" | "ready" | "error" =
    loadedKey === currentKey ? "ready" : failedKey === currentKey ? "error" : "loading"

  const [pendingAction, setPendingAction] = useState<string | null>(null)
  const pendingRef = useRef(false)

  const releasedOnInputRef = useRef<HTMLInputElement>(null)
  const chartNumberInputRef = useRef<HTMLInputElement>(null)
  const supportsHeadingRef = useRef<HTMLHeadingElement>(null)
  const pwhtHeadingRef = useRef<HTMLHeadingElement>(null)

  const markRecorded = useMarkInputsRecorded()

  const pathname = usePathname()
  const query = useSearchParams().toString()
  const here = query ? `${pathname}?${query}` : pathname
  const can = useOptionalAccess()?.can

  const ndeHref =
    spool && can && canVisit("/nde", can)
      ? linkFrom(`/nde?spool=${encodeURIComponent(spool.spoolRevisionId)}`, here)
      : null

  const materialHref =
    spool && can && canVisit("/fabrication/material-check", can)
      ? linkFrom(`/fabrication/material-check?spool=${encodeURIComponent(spool.spoolRevisionId)}`, here)
      : null

  const weldsHref =
    spool && can && canVisit("/fabrication/weld-progress", can)
      ? linkFrom(`/fabrication/weld-progress?spool=${encodeURIComponent(spool.spoolRevisionId)}`, here)
      : null

  const reload = useCallback(async () => {
    if (!spoolRevisionId) return
    const key = `${spoolRevisionId}:${refreshToken}`
    const client = getSupabaseBrowserClient()
    const [status, nextReadiness, nextObligations, nextPwht, nextSupports] = await Promise.all([
      loadSpoolStatus(client, spoolRevisionId),
      loadReadiness(client, spoolRevisionId),
      loadObligations(client, spoolRevisionId),
      loadPwhtRequirements(client, spoolRevisionId),
      loadSupports(client, spoolRevisionId),
    ])
    setSpool(status)
    setReadiness(nextReadiness)
    setObligations(nextObligations)
    setPwht(nextPwht)
    setSupports(nextSupports)
    setLoadedKey(key)
  }, [spoolRevisionId, refreshToken, setSpool])

  useEffect(() => {
    if (!spoolRevisionId || !currentKey) return
    let cancelled = false
    const key = currentKey
    const client = getSupabaseBrowserClient()
    void Promise.all([
      loadSpoolStatus(client, spoolRevisionId),
      loadReadiness(client, spoolRevisionId),
      loadObligations(client, spoolRevisionId),
      loadPwhtRequirements(client, spoolRevisionId),
      loadSupports(client, spoolRevisionId),
    ])
      .then(([status, nextReadiness, nextObligations, nextPwht, nextSupports]) => {
        if (cancelled) return
        setSpool(status)
        setReadiness(nextReadiness)
        setObligations(nextObligations)
        setPwht(nextPwht)
        setSupports(nextSupports)
        setLoadedKey(key)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setFailedKey(key)
        toast.error(error instanceof Error ? error.message : "Release checks could not be loaded.")
      })
    return () => {
      cancelled = true
    }
  }, [spoolRevisionId, currentKey, setSpool])

  const gate = readiness
    ? describeReleaseGate(readiness)
    : { allowed: false, reason: "Release checks could not be loaded." }

  const handleRelease = async () => {
    if (!spool || pendingRef.current || !gate.allowed || spool.dates.qc_release !== null) return
    pendingRef.current = true
    setPendingAction("release")
    try {
      await releaseQualityRecord(
        getSupabaseBrowserClient(),
        spool.spoolRevisionId,
        releasedOn,
        null,
        crypto.randomUUID(),
      )
      if (releasedOnInputRef.current) markRecorded([releasedOnInputRef.current])
      try {
        await reload()
      } catch {
        toast.error("Recorded; status could not be refreshed. Retry refresh.")
      }
      toast.success("The spool is QC released.")
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "The QC release could not be recorded.")
    } finally {
      pendingRef.current = false
      setPendingAction(null)
    }
  }

  const handleInstallSupport = async (supportId: string) => {
    if (pendingRef.current) return
    pendingRef.current = true
    setPendingAction(`support-${supportId}`)
    try {
      await recordSupportProgress(
        getSupabaseBrowserClient(),
        supportId,
        releasedOn,
        crypto.randomUUID(),
      )
      try {
        await reload()
      } catch {
        toast.error("Recorded; status could not be refreshed. Retry refresh.")
      }
      toast.success("Support installation recorded.")
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "The support could not be recorded.")
    } finally {
      pendingRef.current = false
      setPendingAction(null)
    }
  }

  const handleRecordPwht = async (pwhtId: string) => {
    if (pendingRef.current || chartNumber.trim() === "") return
    pendingRef.current = true
    setPendingAction(`pwht-${pwhtId}`)
    try {
      await recordPwhtResult(
        getSupabaseBrowserClient(),
        pwhtId,
        chartNumber,
        releasedOn,
        "accepted",
        crypto.randomUUID(),
      )
      if (chartNumberInputRef.current) markRecorded([chartNumberInputRef.current])
      try {
        await reload()
      } catch {
        toast.error("Recorded; status could not be refreshed. Retry refresh.")
      }
      toast.success("PWHT result recorded.")
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "The PWHT result could not be recorded.")
    } finally {
      pendingRef.current = false
      setPendingAction(null)
    }
  }

  const goToSupports = () => {
    setEvidence("supports")
    requestAnimationFrame(() => {
      supportsHeadingRef.current?.focus({ preventScroll: true })
      const scrollContainer = supportsHeadingRef.current?.closest("[data-operation-scroll]")
      if (scrollContainer instanceof HTMLElement && supportsHeadingRef.current) {
        const top = supportsHeadingRef.current.offsetTop - scrollContainer.offsetTop
        scrollContainer.scrollTo({ top: Math.max(0, top - 16), behavior: "smooth" })
      }
    })
  }

  const goToPwht = () => {
    setEvidence("pwht")
    requestAnimationFrame(() => {
      pwhtHeadingRef.current?.focus({ preventScroll: true })
      const scrollContainer = pwhtHeadingRef.current?.closest("[data-operation-scroll]")
      if (scrollContainer instanceof HTMLElement && pwhtHeadingRef.current) {
        const top = pwhtHeadingRef.current.offsetTop - scrollContainer.offsetTop
        scrollContainer.scrollTo({ top: Math.max(0, top - 16), behavior: "smooth" })
      }
    })
  }

  const renderBlockerAction = (checkId: ReleaseCheckId): ReactNode => {
    switch (checkId) {
      case "revision":
        return <span className="text-xs font-medium text-destructive">Superseded revision</span>
      case "material":
        if (embedded) {
          return embedded.canOpenOperation?.("material") ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => embedded.onOpenOperation?.("material")}
            >
              Open Material
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">Not available with your project access</span>
          )
        }
        return materialHref ? (
          <Link href={materialHref} className={styles.checkActionLink}>
            Open Material
          </Link>
        ) : (
          <span className="text-xs text-muted-foreground">Not available with your project access</span>
        )
      case "welds":
        if (embedded) {
          return embedded.canOpenOperation?.("welds") ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => embedded.onOpenOperation?.("welds")}
            >
              Open Shop welds
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">Not available with your project access</span>
          )
        }
        return weldsHref ? (
          <Link href={weldsHref} className={styles.checkActionLink}>
            Open Shop welds
          </Link>
        ) : (
          <span className="text-xs text-muted-foreground">Not available with your project access</span>
        )
      case "supports":
        return (
          <Button type="button" size="sm" variant="outline" onClick={goToSupports}>
            Resolve in Supports
          </Button>
        )
      case "pwht":
        return (
          <Button type="button" size="sm" variant="outline" onClick={goToPwht}>
            Resolve in PWHT
          </Button>
        )
      case "nde":
        return ndeHref ? (
          <Link href={ndeHref} className={styles.checkActionLink}>
            Manage in NDE <ArrowRight className="h-3 w-3 ml-1 inline" aria-hidden="true" />
          </Link>
        ) : (
          <span className="text-xs text-muted-foreground">Not available with your project access</span>
        )
    }
  }

  const isReleased = Boolean(spool?.dates.qc_release)
  const isReleasable = Boolean(readiness && evaluateReleaseEligibility(readiness).isReleasable)

  let statusBadge: ReactNode = null
  if (loadState === "loading") {
    statusBadge = (
      <Badge variant="outline" className="border-amber-400 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200">
        Loading release checks…
      </Badge>
    )
  } else if (loadState === "error") {
    statusBadge = (
      <div className="flex items-center gap-2">
        <Badge variant="destructive">Release checks could not be loaded</Badge>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setRefreshToken((token) => token + 1)}
        >
          <RotateCw className="h-3 w-3 mr-1" aria-hidden="true" />
          Retry
        </Button>
      </div>
    )
  } else if (isReleased) {
    statusBadge = (
      <Badge variant="outline" className="border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
        QC released on {spool?.dates.qc_release}
      </Badge>
    )
  } else if (isReleasable) {
    statusBadge = (
      <Badge variant="outline" className="border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
        Ready for QC release
      </Badge>
    )
  } else {
    statusBadge = (
      <Badge variant="outline" className="border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
        Blocked
      </Badge>
    )
  }

  return (
    <div className="space-y-4" data-explicit-unsaved-commit="true">
      {/* Inside the workbench the one spool list sits above every operation. */}
      {embedded ? null : (
        <SpoolPicker
          projectId={projectId}
          value={spool?.spoolRevisionId ?? null}
          selected={spool}
          onChange={setSpool}
          browsing={browsingSpools}
          onBrowsingChange={setBrowsingSpools}
          refreshToken={refreshToken}
        />
      )}

      {spool && !browsingSpools ? (
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
              <CardTitle>
                {embedded ? "Release decision" : `${spool.isoNumber} / ${spool.spoolNumber}`}
              </CardTitle>
              {statusBadge}
            </CardHeader>
            <CardContent className="space-y-4">
              {embedded ? null : <SpoolStageTimeline status={spool} />}

              {readiness && loadState === "ready" ? (
                <div className={styles.checksList}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Readiness checks
                  </p>
                  <ul className={styles.checksTable}>
                    {releaseChecks(readiness).map((check) => (
                      <li key={check.id} className={styles.checkRow} data-complete={check.complete ? "" : undefined}>
                        <div className={styles.checkIcon}>
                          {check.complete ? (
                            <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-amber-600" aria-hidden="true" />
                          )}
                        </div>
                        <div className={styles.checkInfo}>
                          <span className={styles.checkLabel}>{check.label}</span>
                          <span className={styles.checkDetail}>{check.detail}</span>
                        </div>
                        <div className={styles.checkStatus}>
                          {check.complete ? (
                            <span className={styles.checkCompleteBadge}>Complete</span>
                          ) : (
                            renderBlockerAction(check.id)
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {isReleased ? (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                  This spool was QC released on <span className="font-semibold">{spool.dates.qc_release}</span>.
                </div>
              ) : (
                <div className="flex flex-wrap items-end gap-2 pt-1">
                  <label className="text-sm font-medium">
                    Release date
                    <Input
                      ref={releasedOnInputRef}
                      type="date"
                      value={releasedOn}
                      disabled={pendingAction !== null}
                      onChange={(event) => setReleasedOn(event.target.value)}
                      className="mt-1"
                    />
                  </label>
                  <Button
                    type="button"
                    disabled={
                      loadState !== "ready" ||
                      !gate.allowed ||
                      spool.dates.qc_release !== null ||
                      pendingAction !== null
                    }
                    loading={pendingAction === "release"}
                    onClick={() => void handleRelease()}
                  >
                    QC release spool
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {embedded ? (
            <nav className={styles.evidenceNav} aria-label="QC release evidence">
              <button
                type="button"
                aria-pressed={evidence === "supports"}
                aria-controls="release-supports"
                onClick={() => setEvidence("supports")}
              >
                Supports <span>{supports.filter((support) => !support.installedOn).length} open</span>
              </button>
              <button
                type="button"
                aria-pressed={evidence === "nde"}
                aria-controls="release-nde"
                onClick={() => setEvidence("nde")}
              >
                NDE <span>{spool.ndePending} open</span>
              </button>
              <button
                type="button"
                aria-pressed={evidence === "pwht"}
                aria-controls="release-pwht"
                onClick={() => setEvidence("pwht")}
              >
                PWHT <span>{spool.pwhtPending} open</span>
              </button>
            </nav>
          ) : null}

          <Card id="release-supports" hidden={Boolean(embedded) && evidence !== "supports"}>
            <CardHeader>
              <CardTitle ref={supportsHeadingRef} tabIndex={-1} className="outline-none">
                Supports
              </CardTitle>
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
                          disabled={
                            support.installedOn !== null ||
                            pendingAction !== null
                          }
                          loading={pendingAction === `support-${support.supportRevisionId}`}
                          onClick={() => void handleInstallSupport(support.supportRevisionId)}
                        >
                          Mark installed
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {supports.length === 0 ? (
                <p className="text-muted-foreground text-sm">No supports on this spool.</p>
              ) : null}
            </CardContent>
          </Card>

          <Card id="release-nde" hidden={Boolean(embedded) && evidence !== "nde"}>
            <CardHeader>
              <CardTitle tabIndex={-1} className="outline-none">
                NDE obligations
              </CardTitle>
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
                        <StatusBadge status={obligation.disposition} />
                      </TableCell>
                      <TableCell>
                        {ndeHref ? (
                          <Link href={ndeHref} className={styles.checkActionLink}>
                            Manage in NDE
                          </Link>
                        ) : (
                          <span className="text-xs text-muted-foreground">Not in your access</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {obligations.length === 0 ? (
                <p className="text-muted-foreground text-sm">No NDE obligations on this spool.</p>
              ) : null}
              <p className="mt-2 text-xs text-muted-foreground">
                NDE obligations are managed through NDE inspection batches.
              </p>
            </CardContent>
          </Card>

          <Card id="release-pwht" hidden={Boolean(embedded) && evidence !== "pwht"}>
            <CardHeader>
              <CardTitle ref={pwhtHeadingRef} tabIndex={-1} className="outline-none">
                PWHT
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <label className="block text-sm font-medium">
                Chart number
                <Input
                  ref={chartNumberInputRef}
                  value={chartNumber}
                  disabled={pendingAction !== null}
                  onChange={(event) => setChartNumber(event.target.value)}
                  placeholder="Chart number from the PWHT record"
                  className="mt-1"
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
                          disabled={
                            requirement.acceptedOn !== null ||
                            chartNumber.trim() === "" ||
                            pendingAction !== null
                          }
                          loading={pendingAction === `pwht-${requirement.id}`}
                          onClick={() => void handleRecordPwht(requirement.id)}
                        >
                          Record accepted
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {pwht.length === 0 ? (
                <p className="text-muted-foreground text-sm">No PWHT requirements on this spool.</p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Select a spool to review its QC release.</p>
      )}
    </div>
  )
}
