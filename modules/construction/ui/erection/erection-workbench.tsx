"use client"

import { useTranslations } from "next-intl"
import { usePathname, useSearchParams } from "next/navigation"
import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { canVisit } from "@/components/pipeqc/navigation-model"
import { useRequestLeave } from "@/components/pipeqc/unsaved-input-guard"
import { useWorkContextParam } from "@/components/pipeqc/work-context"
import { useOptionalAccess } from "@/modules/access/ui/access-context"

import type { ErectionReadiness } from "../../infrastructure/supabase-erection-repository"
import { SpoolDrawer, SpoolTimeline } from "../spool-drawer"
import styles from "../spool-workbench.module.css"
import {
  ERECTION_OPERATIONS,
  erectionOperationForPath,
  erectionStep,
  nextErectionOperation,
  type ErectionOperation,
  type ErectionOperationId,
  type ErectionStep,
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
  const t = useTranslations("erection.workbench")
  switch (operation) {
    case "to_site":
      return <ErectionStageScreen stage="to_site" title={t("toSite")} description="" />
    case "material":
      return <FieldMaterialCheckScreen title={t("fieldMaterialCheck")} description="" />
    case "erected":
      return <ErectionStageScreen stage="erected" title={t("erected")} description="" />
    case "welded":
      return <FieldWeldProgressScreen title={t("weldedBolted")} description="" stage="welded_bolted" />
    case "supported":
      return <FieldSupportProgressScreen title={t("supported")} description="" stage="supported" />
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
  const t = useTranslations("erection.workbench")
  const te = useTranslations("erection")
  const stepWords = (step: ErectionStep) => ({ ...step, lines: step.lines.map((line) => ({ label: te(`line.${line.label}`), value: line.value === "yes" ? te("shared.yes") : line.value })) })
  const state = useErectionReadiness()
  const { projectId, isLoading, loadFailed, selected, select, canView, refreshToken } = state
  const [spoolParam] = useWorkContextParam("spool")
  const requestLeave = useRequestLeave()
  const can = useOptionalAccess()?.can
  const pathname = usePathname()
  const query = useSearchParams().toString()
  const here = query ? `${pathname}?${query}` : pathname

  if (!projectId) {
    return <p className="text-muted-foreground text-sm">{t("selectAProjectToWork")}</p>
  }
  if (!canView) {
    return (
      <p className="text-muted-foreground text-sm">
        {t("viewingErectionProgressNeedsThe")}
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

  return (
    <ErectionReadinessProvider value={state}>
      <div className="space-y-4">
        <h1 className="sr-only">{t("fieldSpools")}</h1>
        <div className={styles.split} data-open={spoolParam ? "" : undefined}>
          <div className={styles.listPane}>
            <FieldSpoolPicker
              projectId={projectId}
              value={selected?.spoolRevisionId ?? null}
              selected={selected}
              onChange={choose}
              browsing
              onBrowsingChange={() => undefined}
              refreshToken={refreshToken}
            />
          </div>

          {loadFailed ? (
            <p className="text-destructive text-sm">
              {t("fieldSpoolsCouldNotBe")}
            </p>
          ) : resolving ? (
            <Skeleton className="h-96 w-full" />
          ) : unavailable ? (
            <div className="rounded-md border border-destructive/20 bg-destructive/10 p-4 text-sm">
              <p className="font-semibold text-destructive">
                {t("selectedSpoolIsNotAvailable")}
              </p>
              <p className="mt-1 text-muted-foreground">
                {t("theSpoolLinkMayBelong")}
              </p>
              <div className="mt-3">
                <Button variant="outline" size="sm" onClick={close}>
                  {t("clearSelection")}
                </Button>
              </div>
            </div>
          ) : spool && current ? (
            <SpoolDrawer
              kicker={t("spoolInErection")}
              title={spool.spoolNumber}
              meta={te("shared.revIso", { rev: spool.revisionNumber, iso: spool.isoNumber })}
              status={
                <span className={styles.stageBadge}>
                  {spool.isRft
                    ? t("readyForTest")
                    : t("nextOperation", { operation: te(`operation.${nextErectionOperation(spool)}`) })}
                </span>
              }
              onClose={close}
            >
              <SpoolTimeline
                label={t("erectionOf", { spool: spool.spoolNumber })}
                processTitle={t("erectionProcess")}
                active={current.id}
                onOpen={(id) => openOperation(id as ErectionOperationId)}
                steps={ERECTION_OPERATIONS.map((item) => ({
                  id: item.id,
                  title: te(`operation.${item.id}`),
                  ...stepWords(erectionStep(item.id, spool)),
                  locked: !canOpen(item),
                  completedLabel: item.id === "rft" ? t("ready") : undefined,
                  stateLabel:
                    item.id === "rft"
                      ? spool.isRft
                        ? t("ready")
                        : t("evidenceRequired")
                      : item.id === "material"
                        ? erectionStep(item.id, spool).state === "done"
                          ? t("evidenceComplete")
                          : t("evidence")
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
                          {t("thisOperationIsNotPart")}
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
