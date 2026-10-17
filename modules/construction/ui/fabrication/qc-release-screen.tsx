"use client"

import { useTranslations } from "next-intl"
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"

import { errorDetail } from "@/i18n/format"
import { codeLabel } from "@/i18n/translator"
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
import { releaseChecks, type ReleaseCheck, type ReleaseCheckDetail, type ReleaseCheckId } from "./release-checks"
import { SpoolPicker } from "./spool-picker"
import { useContextSpool, type EmbeddedSpool } from "./use-context-spool"
import { SpoolStageTimeline } from "./spool-stage-timeline"
import { panelMode } from "../panel-mode"
import styles from "../spool-workbench.module.css"

const today = () => new Date().toISOString().slice(0, 10)

export function QcReleaseScreen({
  projectId,
  embedded,
}: {
  projectId: string
  embedded?: EmbeddedSpool
}) {
  const t = useTranslations("fabrication.qcRelease")
  const tf = useTranslations("fabrication")
  const tc = useTranslations("codes")
  const checkLabel = (check: ReleaseCheck) => tf(`releaseCheck.label.${check.id}`)
  const checkDetail = ({ key, values }: ReleaseCheckDetail) =>
    key === "revisionStatus" ? codeLabel(tc, "status", String(values?.status ?? "")) : tf(`releaseCheck.detail.${key}`, values)
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
  const [evidence, setEvidence] = useState<"supports" | "nde" | "pwht" | null>(null)
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
        toast.error(t("releaseChecksCouldNotBe"), { description: errorDetail(error) })
      })
    return () => {
      cancelled = true
    }
  }, [spoolRevisionId, currentKey, setSpool])

  const gate = readiness ? describeReleaseGate(readiness) : null

  const handleRelease = async () => {
    if (!spool || pendingRef.current || !gate?.allowed || spool.dates.qc_release !== null) return
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
        toast.error(t("recordedStatusCouldNotBe"))
      }
      toast.success(t("theSpoolIsQcReleased"))
    } catch (error: unknown) {
      toast.error(t("theQcReleaseCouldNot"), { description: errorDetail(error) })
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
        toast.error(t("recordedStatusCouldNotBe"))
      }
      toast.success(t("supportInstallationRecorded"))
    } catch (error: unknown) {
      toast.error(t("theSupportCouldNotBe"), { description: errorDetail(error) })
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
        toast.error(t("recordedStatusCouldNotBe"))
      }
      toast.success(t("pwhtResultRecorded"))
    } catch (error: unknown) {
      toast.error(t("thePwhtResultCouldNot"), { description: errorDetail(error) })
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
        return <span className="text-xs font-medium text-destructive">{t("supersededRevision")}</span>
      case "material":
        if (embedded) {
          return embedded.canOpenOperation?.("material") ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => embedded.onOpenOperation?.("material")}
            >
              {t("openMaterial")}
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">{t("notAvailableWithYourProject")}</span>
          )
        }
        return materialHref ? (
          <Link href={materialHref} className={styles.checkActionLink}>
            {t("openMaterial")}
          </Link>
        ) : (
          <span className="text-xs text-muted-foreground">{t("notAvailableWithYourProject")}</span>
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
              {t("openShopWelds")}
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">{t("notAvailableWithYourProject")}</span>
          )
        }
        return weldsHref ? (
          <Link href={weldsHref} className={styles.checkActionLink}>
            {t("openShopWelds")}
          </Link>
        ) : (
          <span className="text-xs text-muted-foreground">{t("notAvailableWithYourProject")}</span>
        )
      case "supports":
        return (
          <Button type="button" size="sm" variant="outline" onClick={goToSupports}>
            {t("resolveInSupports")}
          </Button>
        )
      case "pwht":
        return (
          <Button type="button" size="sm" variant="outline" onClick={goToPwht}>
            {t("resolveInPwht")}
          </Button>
        )
      case "nde":
        return ndeHref ? (
          <Link href={ndeHref} className={styles.checkActionLink}>
            {t("manageInNde")} <ArrowRight className="h-3 w-3 ml-1 inline" aria-hidden="true" />
          </Link>
        ) : (
          <span className="text-xs text-muted-foreground">{t("notAvailableWithYourProject")}</span>
        )
    }
  }

  const isReleased = Boolean(spool?.dates.qc_release)
  const isReleasable = Boolean(readiness && evaluateReleaseEligibility(readiness).isReleasable)

  let statusBadge: ReactNode = null
  if (loadState === "loading") {
    statusBadge = (
      <Badge variant="outline" className="border-amber-400 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200">
        {t("loadingReleaseChecks")}
      </Badge>
    )
  } else if (loadState === "error") {
    statusBadge = (
      <div className="flex items-center gap-2">
        <Badge variant="destructive">{t("releaseChecksCouldNotBe2")}</Badge>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setRefreshToken((token) => token + 1)}
        >
          <RotateCw className="h-3 w-3 mr-1" aria-hidden="true" />
          {t("retry")}
        </Button>
      </div>
    )
  } else if (isReleased) {
    statusBadge = (
      <Badge variant="outline" className="border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
        {t("qcReleasedOn", { date: spool?.dates.qc_release ?? "" })}
      </Badge>
    )
  } else if (isReleasable) {
    statusBadge = (
      <Badge variant="outline" className="border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
        {t("readyForQcRelease")}
      </Badge>
    )
  } else {
    statusBadge = (
      <Badge variant="outline" className="border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
        {t("blocked")}
      </Badge>
    )
  }

  // Supports are installed here, and Fabricated needs them, so the card stays reachable while the
  // step is blocked on Fabricated; hiding it there left a spool with a shop support stuck.
  const renderSupportsCard = (hidden: boolean, withDate = false) => (
    <Card id="release-supports" hidden={hidden}>
      <CardHeader>
        <CardTitle ref={supportsHeadingRef} tabIndex={-1} className="outline-none">
          {t("supports")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {withDate ? (
          <label className="mb-3 block text-sm font-medium">
            {t("installationDate")}
            <Input
              type="date"
              value={releasedOn}
              disabled={pendingAction !== null}
              onChange={(event) => setReleasedOn(event.target.value)}
              className="mt-1 w-48"
            />
          </label>
        ) : null}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("support")}</TableHead>
              <TableHead>{t("type")}</TableHead>
              <TableHead>{t("qty")}</TableHead>
              <TableHead>{t("installed")}</TableHead>
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
                    {t("markInstalled")}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {supports.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("noSupportsOnThisSpool")}</p>
        ) : null}
      </CardContent>
    </Card>
  )

  const isDone = Boolean(spool?.dates.qc_release)
  const blockedBy = !isDone && !spool?.dates.fabricated ? t("shopWelds") : null
  const mode = spool ? panelMode({ allRecorded: isDone, blockedBy }) : "actionable"

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
          {mode === "done" ? (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                {t("qcReleasedDate", { date: spool.dates.qc_release ?? "" })}
              </p>
              {readiness && loadState === "ready" ? (
                <details className="text-xs text-muted-foreground">
                  <summary className="cursor-pointer font-medium hover:text-foreground">
                    {t("readinessChecks")}
                  </summary>
                  <div className="mt-2">
                    <ul className={styles.checksTable}>
                      {releaseChecks(readiness).map((check) => (
                        <li key={check.id} className={styles.checkRow} data-complete={check.complete ? "" : undefined}>
                          <div className={styles.checkIcon}>
                            <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                          </div>
                          <div className={styles.checkInfo}>
                            <span className={styles.checkLabel}>{checkLabel(check)}</span>
                            <span className={styles.checkDetail}>{checkDetail(check.detail)}</span>
                          </div>
                          <div className={styles.checkStatus}>
                            <span className={styles.checkCompleteBadge}>{t("complete")}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </details>
              ) : null}
            </div>
          ) : mode === "blocked" ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>{t("shopWeldsMustBeComplete")}</span>
                {embedded ? (
                  embedded.canOpenOperation?.("welds") ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => embedded.onOpenOperation?.("welds")}
                    >
                      {t("openShopWelds")}
                    </Button>
                  ) : null
                ) : weldsHref ? (
                  <Button asChild size="sm" variant="outline">
                    <Link href={weldsHref}>{t("openShopWelds")}</Link>
                  </Button>
                ) : null}
              </div>
              {renderSupportsCard(false, true)}
            </div>
          ) : (
            <>
              <Card>
                <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
                  <CardTitle>
                    {embedded ? t("releaseDecision") : `${spool.isoNumber} / ${spool.spoolNumber}`}
                  </CardTitle>
                  {statusBadge}
                </CardHeader>
                <CardContent className="space-y-4">
                  {embedded ? null : <SpoolStageTimeline status={spool} />}

                  {readiness && loadState === "ready" ? (
                    <div className={styles.checksList}>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {t("readinessChecks")}
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
                              <span className={styles.checkLabel}>{checkLabel(check)}</span>
                              <span className={styles.checkDetail}>{checkDetail(check.detail)}</span>
                            </div>
                            <div className={styles.checkStatus}>
                              {check.complete ? (
                                <span className={styles.checkCompleteBadge}>{t("complete")}</span>
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
                      {t("thisSpoolWasQcReleased")} <span className="font-semibold">{spool.dates.qc_release}</span>.
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-end gap-2 pt-1">
                      <label className="text-sm font-medium">
                        {t("releaseDate")}
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
                          !gate?.allowed ||
                          spool.dates.qc_release !== null ||
                          pendingAction !== null
                        }
                        loading={pendingAction === "release"}
                        onClick={() => void handleRelease()}
                      >
                        {t("qcReleaseSpool")}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

          {renderSupportsCard(Boolean(embedded) && evidence !== "supports")}

          <Card id="release-nde" hidden={Boolean(embedded) && evidence !== "nde"}>
            <CardHeader>
              <CardTitle tabIndex={-1} className="outline-none">
                {t("ndeObligations")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("joint")}</TableHead>
                    <TableHead>{t("method")}</TableHead>
                    <TableHead>{t("cycle")}</TableHead>
                    <TableHead>{t("coverage")}</TableHead>
                    <TableHead>{t("selection")}</TableHead>
                    <TableHead>{t("status")}</TableHead>
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
                            ? t("original")
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
                            {t("manageInNde")}
                          </Link>
                        ) : (
                          <span className="text-xs text-muted-foreground">{t("notInYourAccess")}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {obligations.length === 0 ? (
                <p className="text-muted-foreground text-sm">{t("noNdeObligationsOnThis")}</p>
              ) : null}
              <p className="mt-2 text-xs text-muted-foreground">
                {t("ndeObligationsAreManagedThrough")}
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
                {t("chartNumber")}
                <Input
                  ref={chartNumberInputRef}
                  value={chartNumber}
                  disabled={pendingAction !== null}
                  onChange={(event) => setChartNumber(event.target.value)}
                  placeholder={t("chartNumberFromThePwht")}
                  className="mt-1"
                />
              </label>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("joint")}</TableHead>
                    <TableHead>{t("threshold")}</TableHead>
                    <TableHead>{t("accepted")}</TableHead>
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
                          {t("recordAccepted")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {pwht.length === 0 ? (
                <p className="text-muted-foreground text-sm">{t("noPwhtRequirementsOnThis")}</p>
              ) : null}
            </CardContent>
          </Card>
            </>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t("selectASpoolToReview")}</p>
      )}
    </div>
  )
}
