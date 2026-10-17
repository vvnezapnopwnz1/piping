"use client"

import { useTranslations } from "next-intl"
import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { RotateCw } from "lucide-react"

import { errorDetail } from "@/i18n/format"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { canVisit } from "@/components/pipeqc/navigation-model"
import { useMarkInputsRecorded } from "@/components/pipeqc/unsaved-input-guard"
import { linkFrom } from "@/components/pipeqc/workspace-model"
import { useOptionalAccess } from "@/modules/access/ui/access-context"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import { describePaintGate } from "../../application/release-spool"
import {
  loadLocations,
  loadPaintOptions,
  loadSpoolStatus,
  recordConstructionProgress,
  recordLaydown,
  recordPaintProgress,
  type LocationOption,
  type PaintOption,
} from "../../infrastructure/supabase-construction-repository"
import { SpoolPicker } from "./spool-picker"
import { useContextSpool, type EmbeddedSpool } from "./use-context-spool"
import { SpoolStageTimeline } from "./spool-stage-timeline"
import { panelMode } from "../panel-mode"
import styles from "../spool-workbench.module.css"
import { useGateReason } from "../gate-reason"

const today = () => new Date().toISOString().slice(0, 10)

export function PaintLaydownScreen({
  projectId,
  mode,
  embedded,
}: {
  projectId: string
  mode: "paint" | "laydown"
  embedded?: EmbeddedSpool
}) {
  const reasonText = useGateReason()
  const t = useTranslations("fabrication.paintLaydown")
  const [ownSpool, setOwnSpool] = useContextSpool(projectId, { enabled: !embedded })
  const spool = embedded ? embedded.spool : ownSpool
  const setSpool = embedded ? embedded.onSpoolChange : setOwnSpool
  const spoolRevisionId = spool?.spoolRevisionId ?? null

  const [paintOptions, setPaintOptions] = useState<PaintOption[]>([])
  const [locations, setLocations] = useState<LocationOption[]>([])
  const [lineServiceId, setLineServiceId] = useState("")
  const [sentToPaintOn, setSentToPaintOn] = useState(today())
  const [paintedOn, setPaintedOn] = useState(today())
  const [finalQcOn, setFinalQcOn] = useState("")
  const [measuredDft, setMeasuredDft] = useState("")
  const [w10p, setW10p] = useState("")
  const [locationId, setLocationId] = useState("")
  const [storedOn, setStoredOn] = useState(today())
  const [refreshToken, setRefreshToken] = useState(0)
  const [browsingSpools, setBrowsingSpools] = useState(false)
  const [attemptedSave, setAttemptedSave] = useState(false)

  const [lastSpoolId, setLastSpoolId] = useState<string | null>(null)
  if (spoolRevisionId !== lastSpoolId) {
    setLastSpoolId(spoolRevisionId)
    setLineServiceId("")
    setSentToPaintOn(today())
    setPaintedOn(today())
    setFinalQcOn("")
    setMeasuredDft("")
    setW10p("")
    setLocationId("")
    setStoredOn(today())
    setAttemptedSave(false)
  }

  const currentKey = `${projectId}:${refreshToken}`
  const [loadedKey, setLoadedKey] = useState<string | null>(null)
  const [failedKey, setFailedKey] = useState<string | null>(null)
  const loadState: "loading" | "ready" | "error" =
    loadedKey === currentKey ? "ready" : failedKey === currentKey ? "error" : "loading"

  const [pendingAction, setPendingAction] = useState<string | null>(null)
  const pendingRef = useRef(false)

  const sentToPaintOnRef = useRef<HTMLInputElement>(null)
  const lineServiceRef = useRef<HTMLSelectElement>(null)
  const paintedOnRef = useRef<HTMLInputElement>(null)
  const finalQcOnRef = useRef<HTMLInputElement>(null)
  const measuredDftRef = useRef<HTMLInputElement>(null)
  const w10pRef = useRef<HTMLInputElement>(null)
  const locationRef = useRef<HTMLSelectElement>(null)
  const storedOnRef = useRef<HTMLInputElement>(null)

  const markRecorded = useMarkInputsRecorded()

  const pathname = usePathname()
  const query = useSearchParams().toString()
  const here = query ? `${pathname}?${query}` : pathname
  const can = useOptionalAccess()?.can

  const releaseHref =
    spool && can && canVisit("/fabrication/qc-release", can)
      ? linkFrom(`/fabrication/qc-release?spool=${encodeURIComponent(spool.spoolRevisionId)}`, here)
      : null

  const paintHref =
    spool && can && canVisit("/fabrication/paint", can)
      ? linkFrom(`/fabrication/paint?spool=${encodeURIComponent(spool.spoolRevisionId)}`, here)
      : null

  useEffect(() => {
    let cancelled = false
    const key = currentKey
    const client = getSupabaseBrowserClient()
    void Promise.all([loadPaintOptions(client, projectId), loadLocations(client, projectId)])
      .then(([options, locationRows]) => {
        if (cancelled) return
        setPaintOptions(options)
        setLocations(locationRows)
        setLoadedKey(key)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setFailedKey(key)
        toast.error(t("referentialsCouldNotBeLoaded"), { description: errorDetail(error) })
      })
    return () => {
      cancelled = true
    }
  }, [projectId, currentKey])

  const reload = useCallback(async () => {
    if (!spoolRevisionId) return
    const status = await loadSpoolStatus(getSupabaseBrowserClient(), spoolRevisionId)
    setSpool(status)
  }, [spoolRevisionId, setSpool])

  const option = paintOptions.find((item) => item.lineServiceId === lineServiceId)
  const measured = measuredDft.trim() === "" ? null : Number(measuredDft)
  const gate = option
    ? describePaintGate(
        spool?.dates.sent_to_paint ?? null,
        option.requiredFinalDftMicrons,
        measured,
        w10p,
      )
    : ({ allowed: false, reason: { code: "select_line_service" } } as const)

  const handleSentToPaint = async () => {
    if (
      !spool ||
      pendingRef.current ||
      spool.dates.qc_release === null ||
      spool.dates.sent_to_paint !== null
    )
      return
    pendingRef.current = true
    setPendingAction("sent-to-paint")
    try {
      await recordConstructionProgress(
        getSupabaseBrowserClient(),
        spool.spoolRevisionId,
        "sent_to_paint",
        sentToPaintOn,
        crypto.randomUUID(),
      )
      if (sentToPaintOnRef.current) markRecorded([sentToPaintOnRef.current])
      try {
        await reload()
      } catch {
        toast.error(t("recordedStatusCouldNotBe"))
      }
      toast.success(t("sentToPaintRecorded"))
    } catch (error: unknown) {
      toast.error(t("sentToPaintCouldNot"), { description: errorDetail(error) })
    } finally {
      pendingRef.current = false
      setPendingAction(null)
    }
  }

  const handleRecordPainting = async () => {
    setAttemptedSave(true)
    if (!spool || pendingRef.current || !gate.allowed) return
    pendingRef.current = true
    setPendingAction("record-painting")
    try {
      await recordPaintProgress(
        getSupabaseBrowserClient(),
        spool.spoolRevisionId,
        lineServiceId,
        {
          painted_on: paintedOn,
          ...(finalQcOn ? { final_qc_on: finalQcOn } : {}),
          ...(measured !== null ? { measured_dft_microns: measured } : {}),
          ...(w10p ? { w10p_form_number: w10p } : {}),
        },
        crypto.randomUUID(),
      )
      const fields = [
        lineServiceRef.current,
        paintedOnRef.current,
        finalQcOnRef.current,
        measuredDftRef.current,
        w10pRef.current,
      ].filter((el): el is HTMLInputElement | HTMLSelectElement => el !== null)
      markRecorded(fields)
      try {
        await reload()
      } catch {
        toast.error(t("recordedStatusCouldNotBe"))
      }
      toast.success(t("paintingRecorded"))
    } catch (error: unknown) {
      toast.error(t("paintingCouldNotBeRecorded"), { description: errorDetail(error) })
    } finally {
      pendingRef.current = false
      setPendingAction(null)
    }
  }

  const handleRecordLaydown = async () => {
    if (
      !spool ||
      pendingRef.current ||
      locationId === "" ||
      spool.dates.final_qc === null
    )
      return
    pendingRef.current = true
    setPendingAction("record-laydown")
    try {
      await recordLaydown(
        getSupabaseBrowserClient(),
        spool.spoolRevisionId,
        locationId,
        storedOn,
        crypto.randomUUID(),
      )
      const fields = [locationRef.current, storedOnRef.current].filter(
        (el): el is HTMLInputElement | HTMLSelectElement => el !== null,
      )
      markRecorded(fields)
      try {
        await reload()
      } catch {
        toast.error(t("recordedStatusCouldNotBe"))
      }
      toast.success(t("laydownRecorded"))
    } catch (error: unknown) {
      toast.error(t("laydownCouldNotBeRecorded"), { description: errorDetail(error) })
    } finally {
      pendingRef.current = false
      setPendingAction(null)
    }
  }

  const paintDone = Boolean(spool?.dates.sent_to_paint && spool?.dates.painted && spool?.dates.final_qc)
  const paintBlockedBy = !spool?.dates.qc_release ? t("qcRelease") : null
  const paintPanelMode = spool ? panelMode({ allRecorded: paintDone, blockedBy: paintBlockedBy }) : "actionable"

  const laydownDone = Boolean(spool?.dates.laydown)
  const laydownBlockedBy = !spool?.dates.painted || !spool?.dates.final_qc ? t("paint") : null
  const laydownPanelMode = spool ? panelMode({ allRecorded: laydownDone, blockedBy: laydownBlockedBy }) : "actionable"

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
          {embedded ? null : (
            <Card>
              <CardHeader>
                <CardTitle>
                  {spool.isoNumber} / {spool.spoolNumber}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SpoolStageTimeline status={spool} />
              </CardContent>
            </Card>
          )}

          {mode === "paint" ? (
            paintPanelMode === "done" ? (
              <p className="text-xs text-muted-foreground">
                {t("paintDoneSummary", { sent: spool.dates.sent_to_paint ?? "—", painted: spool.dates.painted ?? "—", finalQc: spool.dates.final_qc ?? "—" })}
              </p>
            ) : paintPanelMode === "blocked" ? (
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>{t("qcReleaseIsRequiredBefore")}</span>
                {embedded ? (
                  embedded.canOpenOperation?.("release") ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => embedded.onOpenOperation?.("release")}
                    >
                      {t("openQcRelease")}
                    </Button>
                  ) : null
                ) : releaseHref ? (
                  <Button asChild size="sm" variant="outline">
                    <Link href={releaseHref}>{t("openQcRelease")}</Link>
                  </Button>
                ) : null}
              </div>
            ) : !spool.dates.sent_to_paint ? (
              <Card>
                <CardHeader>
                  <CardTitle>{t("sentToPaint")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap items-end gap-2 pt-1">
                    <label className="text-sm font-medium">
                      {t("sentToPaintDate")}
                      <Input
                        ref={sentToPaintOnRef}
                        type="date"
                        value={sentToPaintOn}
                        disabled={pendingAction !== null}
                        onChange={(event) => setSentToPaintOn(event.target.value)}
                        className="mt-1"
                      />
                    </label>
                    <Button
                      type="button"
                      disabled={pendingAction !== null}
                      loading={pendingAction === "sent-to-paint"}
                      onClick={() => void handleSentToPaint()}
                    >
                      {t("recordSentToPaint")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  {t("sentToPaintOn", { date: spool.dates.sent_to_paint ?? "" })}
                </p>
                <Card>
                  <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
                    <CardTitle>{t("painting")}</CardTitle>
                    {loadState === "loading" ? (
                      <Badge variant="outline" className="border-amber-400 bg-amber-50 text-amber-900">
                        {t("loadingPaintReferentials")}
                      </Badge>
                    ) : loadState === "error" ? (
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive">{t("failedToLoadReferentials")}</Badge>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setRefreshToken((t) => t + 1)}
                        >
                          <RotateCw className="h-3 w-3 mr-1" aria-hidden="true" /> {t("retry")}
                        </Button>
                      </div>
                    ) : null}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="text-sm font-medium">
                        {t("lineService")}
                        <select
                          ref={lineServiceRef}
                          className="mt-1 w-full rounded border px-2 py-1"
                          value={lineServiceId}
                          disabled={pendingAction !== null}
                          onChange={(event) => {
                            setLineServiceId(event.target.value)
                            setAttemptedSave(false)
                          }}
                        >
                          <option value="">{t("select")}</option>
                          {paintOptions.map((item) => (
                            <option key={item.lineServiceId} value={item.lineServiceId}>
                              {item.lineServiceCode} — {item.ralCode} ({item.requiredFinalDftMicrons} µm)
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-sm font-medium">
                        {t("paintedOn")}
                        <Input
                          ref={paintedOnRef}
                          type="date"
                          value={paintedOn}
                          disabled={pendingAction !== null}
                          onChange={(event) => setPaintedOn(event.target.value)}
                          className="mt-1"
                        />
                      </label>
                      <label className="text-sm font-medium">
                        {t("finalQcOnOptional")}
                        <Input
                          ref={finalQcOnRef}
                          type="date"
                          value={finalQcOn}
                          disabled={pendingAction !== null}
                          onChange={(event) => setFinalQcOn(event.target.value)}
                          className="mt-1"
                        />
                      </label>
                      <label className="text-sm font-medium">
                        {t("measuredDftMOptional")}
                        <Input
                          ref={measuredDftRef}
                          type="number"
                          value={measuredDft}
                          disabled={pendingAction !== null}
                          onChange={(event) => setMeasuredDft(event.target.value)}
                          className="mt-1"
                        />
                      </label>
                      <label className="text-sm font-medium sm:col-span-2">
                        {t("w10pFormNumber")} {measured !== null ? t("requiredWithDft") : t("optional")}
                        <Input
                          ref={w10pRef}
                          value={w10p}
                          disabled={pendingAction !== null}
                          onChange={(event) => setW10p(event.target.value)}
                          placeholder={t("requiredWhenDftIsEntered")}
                          className="mt-1"
                        />
                      </label>
                    </div>

                    {attemptedSave && gate.reason ? <p className="text-sm text-destructive">{gate.reason ? reasonText(gate.reason) : null}</p> : null}

                    <div className={embedded ? styles.recordActions : undefined}>
                      <Button
                        type="button"
                        disabled={pendingAction !== null}
                        loading={pendingAction === "record-painting"}
                        onClick={() => void handleRecordPainting()}
                      >
                        {t("recordPainting")}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )
          ) : laydownPanelMode === "done" ? (
            <p className="text-xs text-muted-foreground">
              {t("placedInLaydownOn", { date: spool.dates.laydown ?? "" })}
            </p>
          ) : laydownPanelMode === "blocked" ? (
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{t("recordFinalQcBeforeMoving")}</span>
              {embedded ? (
                embedded.canOpenOperation?.("paint") ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => embedded.onOpenOperation?.("paint")}
                  >
                    {t("openPaint")}
                  </Button>
                ) : null
              ) : paintHref ? (
                <Button asChild size="sm" variant="outline">
                  <Link href={paintHref}>{t("openPaint")}</Link>
                </Button>
              ) : null}
            </div>
          ) : (
            <Card>
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
                <CardTitle>{t("laydown")}</CardTitle>
                {loadState === "loading" ? (
                  <Badge variant="outline" className="border-amber-400 bg-amber-50 text-amber-900">
                    {t("loadingLocations")}
                  </Badge>
                ) : loadState === "error" ? (
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">{t("failedToLoadLocations")}</Badge>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setRefreshToken((t) => t + 1)}
                    >
                      <RotateCw className="h-3 w-3 mr-1" aria-hidden="true" /> {t("retry")}
                    </Button>
                  </div>
                ) : null}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm font-medium">
                    {t("location")}
                    <select
                      ref={locationRef}
                      className="mt-1 w-full rounded border px-2 py-1"
                      value={locationId}
                      disabled={pendingAction !== null}
                      onChange={(event) => setLocationId(event.target.value)}
                    >
                      <option value="">{t("select")}</option>
                      {locations.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.code}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm font-medium">
                    {t("storedOn")}
                    <Input
                      ref={storedOnRef}
                      type="date"
                      value={storedOn}
                      disabled={pendingAction !== null}
                      onChange={(event) => setStoredOn(event.target.value)}
                      className="mt-1"
                    />
                  </label>
                </div>

                <div className={embedded ? styles.recordActions : undefined}>
                  <Button
                    type="button"
                    disabled={locationId === "" || pendingAction !== null}
                    loading={pendingAction === "record-laydown"}
                    onClick={() => void handleRecordLaydown()}
                  >
                    {t("recordLaydown")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t("selectASpool")}</p>
      )}
    </div>
  )
}
