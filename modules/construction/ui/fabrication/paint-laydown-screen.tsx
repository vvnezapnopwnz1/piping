"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
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
  type SpoolStatus,
} from "../../infrastructure/supabase-construction-repository"
import { SpoolPicker } from "./spool-picker"
import { SpoolStageTimeline } from "./spool-stage-timeline"

const today = () => new Date().toISOString().slice(0, 10)

export function PaintLaydownScreen({
  projectId,
  mode,
}: {
  projectId: string
  mode: "paint" | "laydown"
}) {
  const [spool, setSpool] = useState<SpoolStatus | null>(null)
  const [paintOptions, setPaintOptions] = useState<PaintOption[]>([])
  const [locations, setLocations] = useState<LocationOption[]>([])
  const [lineServiceId, setLineServiceId] = useState("")
  const [paintedOn, setPaintedOn] = useState(today())
  const [finalQcOn, setFinalQcOn] = useState("")
  const [measuredDft, setMeasuredDft] = useState("")
  const [w10p, setW10p] = useState("")
  const [locationId, setLocationId] = useState("")
  const [storedOn, setStoredOn] = useState(today())
  const [refreshToken, setRefreshToken] = useState(0)
  // Browsing for another spool has to take the joint list and the record form with it:
  // they belong to the spool being replaced, and leaving them on screen invites recording
  // against a spool the operator has already moved on from.
  const [browsingSpools, setBrowsingSpools] = useState(false)

  useEffect(() => {
    const client = getSupabaseBrowserClient()
    void Promise.all([loadPaintOptions(client, projectId), loadLocations(client, projectId)])
      .then(([options, locationRows]) => {
        setPaintOptions(options)
        setLocations(locationRows)
      })
      .catch((error: unknown) =>
        toast.error(error instanceof Error ? error.message : "Referentials could not be loaded."),
      )
  }, [projectId])

  const reload = useCallback(async () => {
    if (!spool) return
    setSpool(await loadSpoolStatus(getSupabaseBrowserClient(), spool.spoolRevisionId))
    setRefreshToken((token) => token + 1)
  }, [spool])

  const option = paintOptions.find((item) => item.lineServiceId === lineServiceId)
  const measured = measuredDft.trim() === "" ? null : Number(measuredDft)
  const gate = option
    ? describePaintGate(spool?.dates.sent_to_paint ?? null, option.requiredFinalDftMicrons, measured, w10p)
    : { allowed: false, reason: "Select the line service so the paint matrix rule can be resolved." }

  const run = async (action: () => Promise<void>, success: string, failure: string) => {
    try {
      await action()
      await reload()
      toast.success(success)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : failure)
    }
  }

  return (
    <div className="space-y-4">
      <SpoolPicker
            projectId={projectId}
            value={spool?.spoolRevisionId ?? null}
            onChange={setSpool}
            browsing={browsingSpools}
            onBrowsingChange={setBrowsingSpools}
            refreshToken={refreshToken}
          />

      {spool && !browsingSpools ? (
        <div className="space-y-4">
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

          {mode === "paint" ? (
            <Card>
              <CardHeader>
                <CardTitle>Painting</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  type="button"
                  variant="outline"
                  disabled={spool.dates.qc_release === null || spool.dates.sent_to_paint !== null}
                  onClick={() =>
                    void run(
                      () =>
                        recordConstructionProgress(
                          getSupabaseBrowserClient(),
                          spool.spoolRevisionId,
                          "sent_to_paint",
                          paintedOn,
                          crypto.randomUUID(),
                        ),
                      "Sent to Paint recorded.",
                      "Sent to Paint could not be recorded.",
                    )
                  }
                >
                  Record Sent to Paint
                </Button>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm">
                    Line service
                    <select
                      className="mt-1 w-full rounded border px-2 py-1"
                      value={lineServiceId}
                      onChange={(event) => setLineServiceId(event.target.value)}
                    >
                      <option value="">Select…</option>
                      {paintOptions.map((item) => (
                        <option key={item.lineServiceId} value={item.lineServiceId}>
                          {item.lineServiceCode} — {item.ralCode} ({item.requiredFinalDftMicrons} µm)
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm">
                    Painted on
                    <Input
                      type="date"
                      value={paintedOn}
                      onChange={(event) => setPaintedOn(event.target.value)}
                    />
                  </label>
                  <label className="text-sm">
                    Final QC on
                    <Input
                      type="date"
                      value={finalQcOn}
                      onChange={(event) => setFinalQcOn(event.target.value)}
                    />
                  </label>
                  <label className="text-sm">
                    Measured DFT (µm)
                    <Input
                      type="number"
                      value={measuredDft}
                      onChange={(event) => setMeasuredDft(event.target.value)}
                    />
                  </label>
                  <label className="text-sm">
                    W10P form number
                    <Input value={w10p} onChange={(event) => setW10p(event.target.value)} />
                  </label>
                </div>

                {gate.reason ? <p className="text-sm text-destructive">{gate.reason}</p> : null}
                <Button
                  type="button"
                  disabled={!gate.allowed}
                  onClick={() =>
                    void run(
                      () =>
                        recordPaintProgress(
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
                        ),
                      "Painting recorded.",
                      "Painting could not be recorded.",
                    )
                  }
                >
                  Record painting
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Laydown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm">
                    Location
                    <select
                      className="mt-1 w-full rounded border px-2 py-1"
                      value={locationId}
                      onChange={(event) => setLocationId(event.target.value)}
                    >
                      <option value="">Select…</option>
                      {locations.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.code}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm">
                    Stored on
                    <Input
                      type="date"
                      value={storedOn}
                      onChange={(event) => setStoredOn(event.target.value)}
                    />
                  </label>
                </div>
                {spool.dates.final_qc === null ? (
                  <p className="text-sm text-destructive">
                    Record the final QC before moving the spool to laydown.
                  </p>
                ) : null}
                <Button
                  type="button"
                  disabled={locationId === "" || spool.dates.final_qc === null}
                  onClick={() =>
                    void run(
                      () =>
                        recordLaydown(
                          getSupabaseBrowserClient(),
                          spool.spoolRevisionId,
                          locationId,
                          storedOn,
                          crypto.randomUUID(),
                        ),
                      "Laydown recorded.",
                      "Laydown could not be recorded.",
                    )
                  }
                >
                  Record laydown
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Select a spool.</p>
      )}
    </div>
  )
}
