"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import { ArrowRight } from "lucide-react"

import { Skeleton } from "@/components/ui/skeleton"
import { canVisit } from "@/components/pipeqc/navigation-model"
import { useRequestLeave } from "@/components/pipeqc/unsaved-input-guard"
import { useWorkContextParam } from "@/components/pipeqc/work-context"
import { linkFrom } from "@/components/pipeqc/workspace-model"
import type { Capability } from "@/modules/access/domain/capability"
import { useOptionalAccess } from "@/modules/access/ui/access-context"

import { stageLabel } from "../../domain/construction-phase"
import type { SpoolStatus } from "../../infrastructure/supabase-construction-repository"
import { FactsStrip, SpoolDrawer, SpoolTimeline } from "../spool-drawer"
import styles from "../spool-workbench.module.css"
import {
  FABRICATION_OPERATIONS,
  nextOperation,
  operationForPath,
  operationState,
  type FabricationOperationId,
} from "./fabrication-operations"
import { MaterialCheckScreen } from "./material-check-screen"
import { PaintLaydownScreen } from "./paint-laydown-screen"
import { QcReleaseScreen } from "./qc-release-screen"
import { SpoolPicker } from "./spool-picker"
import { useContextSpool, type EmbeddedSpool } from "./use-context-spool"
import { WeldProgressScreen } from "./weld-progress-screen"

function OperationPanel({
  operation,
  projectId,
  embedded,
}: {
  operation: FabricationOperationId
  projectId: string
  embedded: EmbeddedSpool
}) {
  switch (operation) {
    case "material":
      return <MaterialCheckScreen projectId={projectId} embedded={embedded} />
    case "welds":
      return <WeldProgressScreen projectId={projectId} embedded={embedded} />
    case "release":
      return <QcReleaseScreen projectId={projectId} embedded={embedded} />
    case "paint":
      return <PaintLaydownScreen projectId={projectId} mode="paint" embedded={embedded} />
    case "laydown":
      return <PaintLaydownScreen projectId={projectId} mode="laydown" embedded={embedded} />
  }
}

function spoolFacts(spool: SpoolStatus, here: string, can: ((capability: Capability) => boolean) | undefined) {
  const ratio = (done: number, total: number) => (total ? `${done} of ${total}` : "none")
  const ndeHref =
    can && canVisit("/nde", can) ? linkFrom(`/nde?spool=${encodeURIComponent(spool.spoolRevisionId)}`, here) : null
  return [
    { label: "Material lines", value: ratio(spool.lineChecked, spool.lineTotal) },
    { label: "Shop welds", value: ratio(spool.weldComplete, spool.weldTotal) },
    { label: "Supports", value: ratio(spool.supportRecorded, spool.supportTotal) },
    {
      label: "NDE open",
      value:
        spool.ndePending > 0 && ndeHref ? (
          <Link href={ndeHref} className={styles.factLink}>
            {spool.ndePending} <ArrowRight aria-hidden="true" />
          </Link>
        ) : (
          String(spool.ndePending)
        ),
    },
    { label: "PWHT open", value: String(spool.pwhtPending) },
    { label: "Releasable", value: spool.isReleasable ? "Yes" : "No" },
  ]
}

/**
 * Fabrication as one workbench: the spool list keeps its full width, and the selected spool opens
 * in a full-height overlay drawer with its eight shop stages in reach and a separate working area
 * for the operation it needs next. Each operation also keeps its own address, so existing links and
 * the access rules behind them lead to the same place.
 */
export function FabricationWorkbench({
  projectId,
  operation,
}: {
  projectId: string
  operation: FabricationOperationId | null
}) {
  const [spool, setSpool] = useContextSpool(projectId)
  const [spoolParam] = useWorkContextParam("spool")
  const [refreshToken, setRefreshToken] = useState(0)
  const requestLeave = useRequestLeave()
  const can = useOptionalAccess()?.can
  const pathname = usePathname()
  const query = useSearchParams().toString()
  const here = query ? `${pathname}?${query}` : pathname

  const currentRevisionRef = useRef(spool?.spoolRevisionId ?? null)
  useEffect(() => {
    currentRevisionRef.current = spool?.spoolRevisionId ?? null
  }, [spool?.spoolRevisionId])

  // A recording inside an operation re-reads the spool; the timeline and the list follow it.
  const onSpoolChange = useCallback(
    (status: SpoolStatus | null) => {
      if (status && currentRevisionRef.current !== status.spoolRevisionId) return
      setSpool(status)
      setRefreshToken((token) => token + 1)
    },
    [setSpool],
  )

  const active = operation ?? (spool ? nextOperation(spool.dates) : null)
  const current = FABRICATION_OPERATIONS.find((candidate) => candidate.id === active) ?? null
  const canOpen = (href: string) => (can ? canVisit(href, can) : false)
  // A spool handed over in the address is read before the drawer is drawn.
  const resolving = Boolean(spoolParam) && !spool

  // Opening a spool where none was open is a new history entry, so Back closes the drawer;
  // switching to another spool or step replaces it. Unrecorded input is asked about first.
  const choose = (status: SpoolStatus) => {
    if (status.spoolRevisionId === spool?.spoolRevisionId) return
    requestLeave(() => setSpool(status, { push: !spoolParam }))
  }
  const close = () => requestLeave(() => setSpool(null, { extra: { op: null } }))
  const openStep = (id: string) => requestLeave(() => setSpool(spool, { extra: { op: id } }))

  return (
    <div className="space-y-4">
      <h1 className="sr-only">Fabrication spools</h1>
      <div className={styles.split} data-open={spoolParam ? "" : undefined}>
        <div className={styles.listPane}>
          <SpoolPicker
            projectId={projectId}
            value={spool?.spoolRevisionId ?? null}
            selected={spool}
            onChange={choose}
            // The list never folds away: the next spool stays one click from the open one.
            browsing
            onBrowsingChange={() => undefined}
            refreshToken={refreshToken}
          />
        </div>

        {resolving ? (
          <Skeleton className="h-96 w-full" />
        ) : spool && current ? (
          <SpoolDrawer
            kicker="Spool in fabrication"
            title={spool.spoolNumber}
            meta={`rev ${spool.revisionNumber} · ${spool.isoNumber}`}
            status={
              <span className={styles.stageBadge}>
                {spool.currentStage ? stageLabel(spool.currentStage) : "Not started"}
              </span>
            }
            onClose={close}
          >
            <FactsStrip facts={spoolFacts(spool, here, can)} />
            <SpoolTimeline
              label={`Shop stages of spool ${spool.spoolNumber}`}
              active={current.id}
              onOpen={openStep}
              steps={FABRICATION_OPERATIONS.map((candidate) => ({
                id: candidate.id,
                title: candidate.title,
                state: operationState(candidate, spool.dates),
                locked: !canOpen(candidate.href),
                lines: candidate.stages.map((stage) => ({
                  label: stageLabel(stage),
                  value: spool.dates[stage] ?? null,
                })),
              }))}
            >
              {canOpen(current.href) ? (
                <OperationPanel
                  key={`${current.id}:${spool.spoolRevisionId}`}
                  operation={current.id}
                  projectId={projectId}
                  embedded={{
                    spool,
                    onSpoolChange,
                    onOpenOperation: openStep,
                    canOpenOperation: (id) => {
                      const target = FABRICATION_OPERATIONS.find((item) => item.id === id)
                      return Boolean(target && canOpen(target.href))
                    },
                  }}
                />
              ) : (
                <p className={styles.notice}>
                  Recording {current.title.toLowerCase()} is not part of your project access.
                </p>
              )}
            </SpoolTimeline>
          </SpoolDrawer>
        ) : null}
      </div>
    </div>
  )
}

/**
 * The page behind /fabrication and every shop operation route: the address decides which step
 * is open, so each existing link and its access rule keep working unchanged.
 */
export function FabricationWorkbenchRoute() {
  const projectId = useOptionalAccess()?.access.projectId ?? null
  const pathname = usePathname()
  const op = useSearchParams().get("op")
  if (!projectId) {
    return <p className="text-muted-foreground text-sm">Select a project to work on fabrication.</p>
  }
  return <FabricationWorkbench projectId={projectId} operation={operationForPath(pathname, op)} />
}
