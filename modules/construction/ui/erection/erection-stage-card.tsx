"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { useRef, useState } from "react"
import { ArrowRight } from "lucide-react"
import { toast } from "sonner"

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
import { erectionStageLabel } from "../../domain/erection-stage"
import {
  recordErectionProgress,
  type ErectionReadiness,
} from "../../infrastructure/supabase-erection-repository"
import styles from "../spool-workbench.module.css"
import {
  ERECTION_OPERATIONS,
  type ErectionOperationId,
} from "./erection-operations"
import {
  useErectionCommands,
  useErectionOperationNavigation,
} from "./erection-screen-shell"

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

  const label = erectionStageLabel(stage)
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
          toast.error("Recorded; status could not be refreshed. Retry refresh.")
          return
        }
        toast.success(`${label} recorded for ${row.spoolNumber}.`)
      } catch (error: unknown) {
        toast.error(error instanceof Error ? error.message : `${label} could not be recorded.`)
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
          Go to {erectionStageLabel(missing)}{" "}
          <ArrowRight className="h-3.5 w-3.5 ml-1 inline" aria-hidden="true" />
        </Button>
      ) : targetHref && canVisitPredecessor ? (
        <Link
          href={linkFrom(
            withProject(
              `${targetHref}?spool=${encodeURIComponent(row.spoolRevisionId)}`,
              activityCode,
            ),
            here,
          )}
          className={styles.checkActionLink}
        >
          Go to {erectionStageLabel(missing)}{" "}
          <ArrowRight className="h-3.5 w-3.5 ml-1 inline" aria-hidden="true" />
        </Link>
      ) : null
    ) : null

  return (
    <Card data-explicit-unsaved-commit="true">
      <CardHeader>
        <CardTitle>Record {label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className={styles.opSummary}>
          <div className={styles.opSummaryItem}>
            <span className={styles.opSummaryLabel}>Current {label} date:</span>
            <span className={styles.opSummaryValue}>
              {alreadyOn ? alreadyOn.slice(0, 10) : "Not recorded"}
            </span>
          </div>
        </div>

        {missing ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
            <span>Record {erectionStageLabel(missing)} before {label}.</span>
            {predecessorAction}
          </div>
        ) : null}

        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            Date {label} happened
            <Input
              ref={dateRef}
              type="date"
              value={occurredOn}
              disabled={isSaving || commands.pending}
              onChange={(event) => setOccurredOn(event.target.value)}
            />
          </label>
          <Button
            type="button"
            onClick={() => void save()}
            loading={isSaving}
            disabled={!dataCurrent || !gate.allowed || commands.pending}
          >
            {alreadyOn ? "Record correction" : `Record ${label}`}
          </Button>
        </div>

        {alreadyOn ? (
          <p className="text-muted-foreground text-sm">
            {label} is already recorded on{" "}
            <span className="font-mono">{alreadyOn.slice(0, 10)}</span>. Recording it again files a
            correcting event and the later date takes effect.
          </p>
        ) : null}

        {!dataCurrent ? (
          <p className="text-destructive text-sm">Refresh spool status before recording.</p>
        ) : gate.reason ? (
          <p className="text-destructive text-sm">{gate.reason}</p>
        ) : null}
      </CardContent>
    </Card>
  )
}
