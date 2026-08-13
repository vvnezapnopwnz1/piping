"use client"

import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import { toStageEvidence } from "../../application/describe-erection-readiness"
import {
  describeErectionStageGate,
  erectionStageDate,
  type RecordableErectionStage,
} from "../../application/record-erection-progress"
import { erectionStageLabel } from "../../domain/erection-stage"
import {
  recordErectionProgress,
  type ErectionReadiness,
} from "../../infrastructure/supabase-erection-repository"

const today = () => new Date().toISOString().slice(0, 10)

interface ErectionStageCardProps {
  row: ErectionReadiness
  stage: RecordableErectionStage
  canRecord: boolean
  onRecorded: () => Promise<void>
}

/**
 * Records one erection stage against the selected spool. The date is entered, never assumed:
 * the milestone being recorded is a field event that happened on a day the user knows and the
 * screen does not.
 */
export function ErectionStageCard({ row, stage, canRecord, onRecorded }: ErectionStageCardProps) {
  const [occurredOn, setOccurredOn] = useState(today())
  const [isSaving, setIsSaving] = useState(false)

  const label = erectionStageLabel(stage)
  const evidence = toStageEvidence(row)
  const alreadyOn = erectionStageDate(stage, evidence)
  const gate = describeErectionStageGate({ stage, evidence, occurredOn, canRecord })

  const save = async () => {
    if (!gate.allowed) return
    setIsSaving(true)
    try {
      await recordErectionProgress(
        getSupabaseBrowserClient(),
        row.spoolRevisionId,
        stage,
        occurredOn,
        crypto.randomUUID(),
      )
      await onRecorded()
      toast.success(`${label} recorded for ${row.spoolNumber}.`)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : `${label} could not be recorded.`)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Record {label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            Date {label} happened
            <Input
              type="date"
              value={occurredOn}
              onChange={(event) => setOccurredOn(event.target.value)}
            />
          </label>
          <Button type="button" onClick={() => void save()} loading={isSaving} disabled={!gate.allowed}>
            {`Record ${label}`}
          </Button>
        </div>

        {alreadyOn ? (
          <p className="text-muted-foreground text-sm">
            {label} is already recorded on{" "}
            <span className="font-mono">{alreadyOn.slice(0, 10)}</span>. Recording it again files a
            correcting event and the later date takes effect.
          </p>
        ) : null}
        {gate.reason ? <p className="text-destructive text-sm">{gate.reason}</p> : null}
      </CardContent>
    </Card>
  )
}
