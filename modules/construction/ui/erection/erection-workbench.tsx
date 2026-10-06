"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { type ReactNode } from "react"
import { ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { canVisit } from "@/components/pipeqc/navigation-model"
import { withProject } from "@/components/pipeqc/project-url"
import { useRequestLeave } from "@/components/pipeqc/unsaved-input-guard"
import { useWorkContextParam } from "@/components/pipeqc/work-context"
import { linkFrom } from "@/components/pipeqc/workspace-model"
import { useSupabaseAuth } from "@/contexts/supabase-auth-context"
import { useOptionalAccess } from "@/modules/access/ui/access-context"

import { currentErectionStageLabel } from "../../application/describe-erection-readiness"
import type { ErectionReadiness } from "../../infrastructure/supabase-erection-repository"
import { FactsStrip, SpoolDrawer, SpoolTimeline } from "../spool-drawer"
import styles from "../spool-workbench.module.css"
import {
  ERECTION_OPERATIONS,
  erectionOperationForPath,
  erectionStep,
  nextErectionOperation,
  type ErectionOperation,
  type ErectionOperationId,
} from "./erection-operations"
import { ErectionRftPanel } from "./erection-rft-panel"
import {
  ErectionCommandProvider,
  ErectionEmbeddedContext,
  ErectionOperationNavigationContext,
} from "./erection-screen-shell"
import { ErectionStageScreen } from "./erection-stage-screen"
import { FieldMaterialCheckScreen } from "./field-material-check-screen"
import { FieldSpoolPicker } from "./field-spool-picker"
import { FieldSupportProgressScreen } from "./field-support-progress-screen"
import { FieldWeldProgressScreen } from "./field-weld-progress-screen"
import { ErectionReadinessProvider, useErectionReadiness } from "./use-erection-readiness"

function OperationPanel({ operation }: { operation: ErectionOperationId }): ReactNode {
  switch (operation) {
    case "to_site":
      return <ErectionStageScreen stage="to_site" title="To Site" description="" />
    case "material":
      return <FieldMaterialCheckScreen title="Field Material Check" description="" />
    case "erected":
      return <ErectionStageScreen stage="erected" title="Erected" description="" />
    case "welded":
      return <FieldWeldProgressScreen title="Welded / Bolted" description="" stage="welded_bolted" />
    case "supported":
      return <FieldSupportProgressScreen title="Supported" description="" stage="supported" />
    case "rft":
      return null
  }
}

/**
 * Erection as one workbench, like fabrication: choose a field spool, see its erection sequence,
 * work on the operation it needs next. The spool table underneath is never pushed or resized,
 * and the selected spool opens in a full-height overlay drawer with six process groups in reach.
 */
export function ErectionWorkbench({ operation }: { operation: ErectionOperationId | null }) {
  const state = useErectionReadiness()
  const { projectId, isLoading, loadFailed, rows, selected, select, canView } = state
  const [spoolParam] = useWorkContextParam("spool")
  const requestLeave = useRequestLeave()
  const can = useOptionalAccess()?.can
  const code = useSupabaseAuth().access?.activityCode
  const pathname = usePathname()
  const query = useSearchParams().toString()
  const here = query ? `${pathname}?${query}` : pathname

  if (!projectId) {
    return <p className="text-muted-foreground text-sm">Select a project to work on erection.</p>
  }
  if (!canView) {
    return (
      <p className="text-muted-foreground text-sm">
        Viewing erection progress needs the erection.view capability on this project.
      </p>
    )
  }

  const spool = selected
  const active = operation ?? (spool ? nextErectionOperation(spool) : null)
  const current = ERECTION_OPERATIONS.find((candidate) => candidate.id === active) ?? null
  const canOpen = (candidate: ErectionOperation) =>
    can ? canVisit(candidate.href.split("?")[0], can) : false

  const resolving = Boolean(spoolParam) && !spool && isLoading
  const unavailable = Boolean(spoolParam) && !spool && !isLoading

  const choose = (row: ErectionReadiness) => {
    if (row.spoolRevisionId === selected?.spoolRevisionId) return
    requestLeave(() => select(row, { push: !spoolParam }))
  }

  const close = () => requestLeave(() => select(null, { extra: { op: null, step: null } }))

  const openOperation = (id: ErectionOperationId) => {
    const target = ERECTION_OPERATIONS.find((item) => item.id === id)
    if (!selected || !target || !canOpen(target)) return
    requestLeave(() => select(selected, { extra: { op: id, step: null } }))
  }

  const ndeHref =
    spool && can && canVisit("/nde", can)
      ? linkFrom(withProject(`/nde?spool=${encodeURIComponent(spool.spoolRevisionId)}`, code), here)
      : null

  return (
    <ErectionReadinessProvider value={state}>
      <div className="space-y-4">
        <h1 className="sr-only">Field spools</h1>
        <div className={styles.split} data-open={spoolParam ? "" : undefined}>
          <div className={styles.listPane}>
            <FieldSpoolPicker
              rows={rows}
              value={selected?.spoolRevisionId ?? null}
              onChange={choose}
              browsing
              onBrowsingChange={() => undefined}
              loading={isLoading}
            />
          </div>

          {loadFailed ? (
            <p className="text-destructive text-sm">
              Field spools could not be loaded, so none are listed and nothing has been changed.
              Reload the page, and report this if it persists.
            </p>
          ) : resolving ? (
            <Skeleton className="h-96 w-full" />
          ) : unavailable ? (
            <div className="rounded-md border border-destructive/20 bg-destructive/10 p-4 text-sm">
              <p className="font-semibold text-destructive">
                Selected spool is not available in this project.
              </p>
              <p className="mt-1 text-muted-foreground">
                The spool link may belong to another project or was removed.
              </p>
              <div className="mt-3">
                <Button variant="outline" size="sm" onClick={close}>
                  Clear selection
                </Button>
              </div>
            </div>
          ) : spool && current ? (
            <SpoolDrawer
              kicker="Spool in erection"
              title={spool.spoolNumber}
              meta={`rev ${spool.revisionNumber} · ${spool.isoNumber}`}
              status={<span className={styles.stageBadge}>{currentErectionStageLabel(spool)}</span>}
              onClose={close}
            >
              <FactsStrip
                facts={[
                  {
                    label: "Material lines",
                    value: `${spool.materialLineChecked} of ${spool.materialLineTotal}`,
                  },
                  {
                    label: "Field welds",
                    value: `${spool.fieldWeldComplete} of ${spool.fieldWeldTotal}`,
                  },
                  {
                    label: "Field supports",
                    value: `${spool.fieldSupportRecorded} of ${spool.fieldSupportTotal}`,
                  },
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
                  { label: "Ready for Test", value: spool.isRft ? "Yes" : "No" },
                ]}
              />
              <SpoolTimeline
                label={`Erection of spool ${spool.spoolNumber}`}
                processTitle="Erection process"
                active={current.id}
                onOpen={(id) => openOperation(id as ErectionOperationId)}
                steps={ERECTION_OPERATIONS.map((item) => ({
                  id: item.id,
                  title: item.title,
                  ...erectionStep(item.id, spool),
                  locked: !canOpen(item),
                  completedLabel: item.id === "rft" ? "Ready" : undefined,
                  stateLabel:
                    item.id === "rft"
                      ? spool.isRft
                        ? "Ready"
                        : "Evidence required"
                      : item.id === "material"
                        ? erectionStep(item.id, spool).state === "done"
                          ? "Evidence complete"
                          : "Evidence"
                        : undefined,
                }))}
              >
                <ErectionOperationNavigationContext.Provider
                  value={{
                    openOperation,
                    canOpenOperation: (id) => {
                      const target = ERECTION_OPERATIONS.find((item) => item.id === id)
                      return Boolean(target && canOpen(target))
                    },
                  }}
                >
                  <ErectionEmbeddedContext.Provider value={true}>
                    <ErectionCommandProvider>
                      {canOpen(current) ? (
                        current.id === "rft" ? (
                          <ErectionRftPanel row={spool} here={here} can={can} />
                        ) : (
                          <OperationPanel
                            key={`${projectId}:${current.id}:${spool.spoolRevisionId}`}
                            operation={current.id}
                          />
                        )
                      ) : (
                        <p className={styles.notice}>
                          This operation is not part of your project access.
                        </p>
                      )}
                    </ErectionCommandProvider>
                  </ErectionEmbeddedContext.Provider>
                </ErectionOperationNavigationContext.Provider>
              </SpoolTimeline>
            </SpoolDrawer>
          ) : null}
        </div>
      </div>
    </ErectionReadinessProvider>
  )
}

/** The page behind /erection and every erection operation route. */
export function ErectionWorkbenchRoute() {
  const pathname = usePathname()
  const params = useSearchParams()
  return (
    <ErectionWorkbench
      operation={erectionOperationForPath(pathname, params.get("op"), params.get("step"))}
    />
  )
}
