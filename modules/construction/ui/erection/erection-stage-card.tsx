"use client"

import { useTranslations } from "next-intl"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { useRef, useState } from "react"
import { toast } from "sonner"

import { errorDetail } from "@/i18n/format"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { canVisit } from "@/components/pipeqc/navigation-model"
import { withProject } from "@/components/pipeqc/project-url"
import { useMarkInputsRecorded } from "@/components/pipeqc/unsaved-input-guard"
import { linkFrom } from "@/components/pipeqc/workspace-model"
import { useSupabaseAuth } from "@/contexts/supabase-auth-context"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import { useOptionalAccess } from "@/modules/access/ui/access-context"
import { toStageEvidence } from "../../application/describe-erection-readiness"
import {
  describeErectionStageGate,
  erectionStageDate,
  firstMissingPredecessor,
  type RecordableErectionStage,
} from "../../application/record-erection-progress"
import type { ErectionStage } from "../../domain/erection-stage"
import {
  recordErectionProgress,
  type ErectionReadiness,
} from "../../infrastructure/supabase-erection-repository"
import { panelMode } from "../panel-mode"
import {
  ERECTION_OPERATIONS,
  type ErectionOperationId,
} from "./erection-operations"
import {
  useErectionCommands,
  useErectionOperationNavigation,
} from "./erection-screen-shell"
import { useErectionGateReason } from "./erection-gate-reason"

const today = () => new Date().toISOString().slice(0, 10)

const operationByStage: Record<RecordableErectionStage, ErectionOperationId> = {
  to_site: "to_site",
  erected: "erected",
  welded_bolted: "welded",
  supported: "supported",
}

interface ErectionStageCardProps {
  row: ErectionReadiness
  stage: RecordableErectionStage
  canRecord: boolean
  dataCurrent?: boolean
  onRecorded: () => Promise<void>
}

/**
 * Records one erection stage against the selected spool. The date is entered, never assumed:
 * the milestone being recorded is a field event that happened on a day the user knows and the
 * screen does not.
 */
export function ErectionStageCard({
  row,
  stage,
  canRecord,
  dataCurrent = true,
  onRecorded,
}: ErectionStageCardProps) {
  const ts = useTranslations("erection.shared")
  const t = useTranslations("erection.stageCard")
  const reasonText = useErectionGateReason()
  const tc = useTranslations("codes")
  const stageName = (stage: ErectionStage) => tc(`erectionStage.${stage}`)
  const [occurredOn, setOccurredOn] = useState(today())
  const [isSaving, setIsSaving] = useState(false)
  const dateRef = useRef<HTMLInputElement>(null)
  const markRecorded = useMarkInputsRecorded()
  const nav = useErectionOperationNavigation()
  const commands = useErectionCommands()
  const can = useOptionalAccess()?.can
  const activityCode = useSupabaseAuth().access?.activityCode
  const pathname = usePathname()
  const query = useSearchParams().toString()
  const here = query ? `${pathname}?${query}` : pathname

  const label = stageName(stage)
  const evidence = toStageEvidence(row)
  const alreadyOn = erectionStageDate(stage, evidence)
  const gate = describeErectionStageGate({ stage, evidence, occurredOn, canRecord })
  const missing = firstMissingPredecessor(stage, evidence)

  const targetOp = missing ? operationByStage[missing] : null
  const targetCandidate = targetOp
    ? ERECTION_OPERATIONS.find((op) => op.id === targetOp)
    : null
  const targetHref = targetCandidate?.href ?? null
  const canOpenPredecessor = targetOp && nav ? nav.canOpenOperation(targetOp) : false
  const canVisitPredecessor = Boolean(
    targetHref && can && canVisit(targetHref.split("?")[0], can),
  )

  const isDone = Boolean(alreadyOn)
  const blockedBy = !isDone && missing ? stageName(missing) : null
  const mode = panelMode({ allRecorded: isDone, blockedBy })

  const save = async () => {
    if (!dataCurrent || !gate.allowed || commands.pending || isSaving) return
    await commands.run(async () => {
      setIsSaving(true)
      try {
        await recordErectionProgress(
          getSupabaseBrowserClient(),
          row.spoolRevisionId,
          stage,
          occurredOn,
          crypto.randomUUID(),
        )
        if (dateRef.current) markRecorded([dateRef.current])
        try {
          await onRecorded()
        } catch {
          toast.error(t("recordedStatusCouldNotBe"))
          return
        }
        toast.success(ts("stageRecordedFor", { stage: label, spool: row.spoolNumber }))
      } catch (error: unknown) {
        toast.error(ts("stageCouldNotBeRecorded", { stage: label }), { description: errorDetail(error) })
      } finally {
        setIsSaving(false)
      }
    })
  }

  const predecessorAction =
    missing && targetOp ? (
      nav && canOpenPredecessor ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => nav.openOperation(targetOp)}
        >
          {ts("open", { stage: stageName(missing) })}
        </Button>
      ) : targetHref && canVisitPredecessor ? (
        <Button asChild size="sm" variant="outline">
          <Link
            href={linkFrom(
              withProject(
                `${targetHref}?spool=${encodeURIComponent(row.spoolRevisionId)}`,
                activityCode,
              ),
              here,
            )}
          >
            {ts("open", { stage: stageName(missing) })}
          </Link>
        </Button>
      ) : null
    ) : null

  if (mode === "done") {
    return (
      <p className="text-xs text-muted-foreground">
        {ts("recordedOn", { date: alreadyOn?.slice(0, 10) ?? "" })}
      </p>
    )
  }

  if (mode === "blocked") {
    return (
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>{ts("recordBefore", { missing: stageName(missing!), stage: label })}</span>
        {predecessorAction}
      </div>
    )
  }

  return (
    <Card data-explicit-unsaved-commit="true">
      <CardHeader>
        <CardTitle>{ts("recordStage", { stage: label })}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm font-medium">
            {ts("dateHappened", { stage: label })}
            <Input
              ref={dateRef}
              type="date"
              value={occurredOn}
              disabled={isSaving || commands.pending}
              onChange={(event) => setOccurredOn(event.target.value)}
              className="mt-1"
            />
          </label>
          <Button
            type="button"
            onClick={() => void save()}
            loading={isSaving}
            disabled={!dataCurrent || !gate.allowed || commands.pending}
          >
            {ts("recordStage", { stage: label })}
          </Button>
        </div>

        {!dataCurrent ? (
          <p className="text-destructive text-sm">{t("refreshSpoolStatusBeforeRecording")}</p>
        ) : gate.reason && !gate.allowed ? (
          <p className="text-destructive text-sm">{gate.reason ? reasonText(gate.reason) : null}</p>
        ) : null}
      </CardContent>
    </Card>
  )
}
