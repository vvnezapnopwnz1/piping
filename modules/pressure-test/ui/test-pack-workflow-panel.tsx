"use client"

import { useTestPackTranslations, type TestPackTranslator } from "@/modules/pressure-test/ui/test-pack-i18n"

import { useMemo } from "react"
import { CheckCircle2, Clock, ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { TestPackCatalogRow } from "../infrastructure/supabase-pressure-test-repository"
import type { PressureTestRequestType } from "./pressure-test-ui-model"
import { PressureTestProgressScreen } from "./pressure-test-progress-screen"
import { RequestPreparationScreen } from "./request-preparation-screen"
import {
  canOperateWorkflow,
  summarizeWorkflowPresentation,
  type StagePresentationState,
} from "./test-pack-workflow-model"
import type { TestPackMode, TestPackOperation } from "./test-pack-workspace-model"
import { useOptionalTestPackWorkspaceContext } from "./test-pack-workspace-context"

export interface TestPackWorkflowPanelProps {
  projectId: string
  pack: TestPackCatalogRow
  canManage: boolean
  dataCurrent: boolean
  currentOperation?: TestPackOperation | null
  currentMode?: TestPackMode | null
  onSelectOperation?: (operation: TestPackOperation | null, mode: TestPackMode | null) => void
}

function stateBadgeVariant(state: StagePresentationState): "default" | "secondary" | "outline" | "destructive" {
  switch (state) {
    case "completed":
      return "default"
    case "ready":
      return "secondary"
    case "ongoing":
      return "secondary"
    case "blocked":
      return "destructive"
    case "not_applicable":
    case "unknown":
      return "outline"
  }
}

function stateLabel(state: StagePresentationState, t: TestPackTranslator): string {
  switch (state) {
    case "completed":
      return t("text.completed")
    case "ready":
      return t("text.ready")
    case "ongoing":
      return t("text.inProgress")
    case "blocked":
      return t("text.blocked")
    case "not_applicable":
      return t("text.notApplicable")
    case "unknown":
      return t("text.unknown")
  }
}

export function TestPackWorkflowPanel({
  projectId: _projectId,
  pack,
  canManage,
  dataCurrent,
  currentOperation,
  currentMode,
  onSelectOperation,
}: TestPackWorkflowPanelProps) {
  const t = useTestPackTranslations()

  const workspace = useOptionalTestPackWorkspaceContext()
  const snapshot = workspace?.snapshot

  const opCheck = canOperateWorkflow(canManage, pack.lifecycle, dataCurrent)

  const summary = useMemo(() => {
    if (!snapshot) return null
    return summarizeWorkflowPresentation({
      isRft: snapshot.readiness?.isRft ?? false,
      blindingWorklist: snapshot.worklists.blinding,
      testingPrecommWorklist: snapshot.worklists.testingPrecomm,
      members: snapshot.members,
      reinstatementTargets: snapshot.worklists.reinstatementTargets,
      effectiveRecords: snapshot.worklists.effectiveReinstatementRecords,
      lineCheckWorklist: snapshot.worklists.lineCheck,
      itemClearanceWorklist: snapshot.worklists.itemClearance,
    })
  }, [snapshot])

  const openOp = (op: TestPackOperation, mode: TestPackMode = "progress") => {
    onSelectOperation?.(op, mode)
  }

  // Map operation to RequestType
  const activeRequestType = useMemo((): PressureTestRequestType | "testing_precomm" | null => {
    switch (currentOperation) {
      case "line_check":
        return "line_check"
      case "item_clearance":
        return "item_clearance"
      case "blinding":
        return "blinding"
      case "testing":
      case "precommissioning":
        return "testing_precomm"
      case "y_reinstatement":
      case "z_reinstatement":
        return "reinstatement"
      default:
        return null
    }
  }, [currentOperation])

  return (
    <div className="space-y-6">
      {!opCheck.allowed && (
        <div className="flex items-center gap-2 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <ShieldAlert className="h-4 w-4 flex-none" />
          <span>{opCheck.reason ? t(opCheck.reason) : null}</span>
        </div>
      )}

      {/* Preparatory operations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">{t("text.preparatoryWork")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {/* Line Check */}
          <div className="rounded border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">{t("text.lineCheck")}</span>
              <span className="text-xs text-muted-foreground">
                {t("text.openOfTotal", { open: summary?.lineCheckSummary.open ?? 0, total: summary?.lineCheckSummary.total ?? 0 })}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">

              {t("text.walkTheLineAndIdentifyOutstandingPunchItems")}
            </p>
            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                variant={currentOperation === "line_check" && currentMode === "preparation" ? "default" : "outline"}
                onClick={() => openOp("line_check", "preparation")}
              >

                {t("text.preparation293")}
              </Button>
              <Button
                size="sm"
                variant={currentOperation === "line_check" && currentMode === "progress" ? "default" : "outline"}
                onClick={() => openOp("line_check", "progress")}
              >

                {t("text.progress")}
              </Button>
            </div>
          </div>

          {/* Item Clearance */}
          <div className="rounded border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">{t("text.itemClearanceXPunches")}</span>
              <span className="text-xs text-muted-foreground">
                {t("text.openOfTotal", { open: summary?.itemClearanceSummary.open ?? 0, total: summary?.itemClearanceSummary.total ?? 0 })}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">

              {t("text.clearCategoryXBlockersIdentifiedDuringLineCheck")}
            </p>
            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                variant={currentOperation === "item_clearance" && currentMode === "preparation" ? "default" : "outline"}
                onClick={() => openOp("item_clearance", "preparation")}
              >

                {t("text.preparation293")}
              </Button>
              <Button
                size="sm"
                variant={currentOperation === "item_clearance" && currentMode === "progress" ? "default" : "outline"}
                onClick={() => openOp("item_clearance", "progress")}
              >

                {t("text.progress")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pressure Test Lifecycle Sequence */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">

            {t("text.pressureTestProcessRftBlindingTestingYPre")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Step 1: Ready For Test */}
          <div className="flex items-center justify-between p-3 rounded border text-sm">
            <div className="flex items-center gap-3">
              {summary?.rftState === "completed" ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              ) : (
                <Clock className="h-5 w-5 text-amber-500" />
              )}
              <div>
                <span className="font-medium">{t("text.1ReadyForTestRft")}</span>
                <p className="text-xs text-muted-foreground">

                  {t("text.derivedServerVerdictFrom12ConstructionAndInspection")}
                </p>
              </div>
            </div>
            <Badge variant={stateBadgeVariant(summary?.rftState ?? "unknown")}>
              {stateLabel(summary?.rftState ?? "unknown", t)}
            </Badge>
          </div>

          {/* Step 2: Blinding */}
          <div className="flex items-center justify-between p-3 rounded border text-sm">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{t("text.2Blinding")}</span>
                <Badge variant={stateBadgeVariant(summary?.blindingState ?? "unknown")}>
                  {stateLabel(summary?.blindingState ?? "unknown", t)}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">

                {t("text.spadesAndBlindFlangesInstalledToIsolateThe")}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={currentOperation === "blinding" && currentMode === "preparation" ? "default" : "outline"}
                onClick={() => openOp("blinding", "preparation")}
              >

                {t("text.assign")}
              </Button>
              <Button
                size="sm"
                variant={currentOperation === "blinding" && currentMode === "progress" ? "default" : "outline"}
                onClick={() => openOp("blinding", "progress")}
              >

                {t("text.complete")}
              </Button>
            </div>
          </div>

          {/* Step 3: Testing */}
          <div className="flex items-center justify-between p-3 rounded border text-sm">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{t("text.3PressureTesting")}</span>
                <Badge variant={stateBadgeVariant(summary?.testingState ?? "unknown")}>
                  {stateLabel(summary?.testingState ?? "unknown", t)}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">

                {t("text.pressurizeTestPackBoundaryAndConfirmHoldingIntegrity")}
              </p>
            </div>
            <Button
              size="sm"
              variant={currentOperation === "testing" ? "default" : "outline"}
              onClick={() => openOp("testing", "progress")}
            >

              {t("text.recordTesting")}
            </Button>
          </div>

          {/* Step 4: Y Reinstatement */}
          <div className="flex items-center justify-between p-3 rounded border text-sm">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{t("text.4CategoryYReinstatement")}</span>
                <Badge variant={stateBadgeVariant(summary?.yState ?? "unknown")}>
                  {stateLabel(summary?.yState ?? "unknown", t)}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">

                {t("text.preTestJointReinstatementRequiredBeforePreCommissioning")}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={currentOperation === "y_reinstatement" && currentMode === "preparation" ? "default" : "outline"}
                disabled={summary?.yState === "not_applicable"}
                onClick={() => openOp("y_reinstatement", "preparation")}
              >

                {t("text.assign")}
              </Button>
              <Button
                size="sm"
                variant={currentOperation === "y_reinstatement" && currentMode === "progress" ? "default" : "outline"}
                disabled={summary?.yState === "not_applicable"}
                onClick={() => openOp("y_reinstatement", "progress")}
              >

                {t("text.recordJoints")}
              </Button>
            </div>
          </div>

          {/* Step 5: Pre-commissioning */}
          <div className="flex items-center justify-between p-3 rounded border text-sm">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{t("text.5PreCommissioning")}</span>
                <Badge variant={stateBadgeVariant(summary?.precommState ?? "unknown")}>
                  {stateLabel(summary?.precommState ?? "unknown", t)}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {summary?.precommState === "blocked" && summary.yState !== "completed" && summary.yState !== "not_applicable"
                  ? t("text.blockedCategoryYReinstatementMustBeCompleteBefore")
                  : t("text.dryingAirBlowingInertingOrOtherPreCommissioning")}
              </p>
            </div>
            <Button
              size="sm"
              variant={currentOperation === "precommissioning" ? "default" : "outline"}
              onClick={() => openOp("precommissioning", "progress")}
            >

              {t("text.recordPreComm")}
            </Button>
          </div>

          {/* Step 6: Z Reinstatement */}
          <div className="flex items-center justify-between p-3 rounded border text-sm">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{t("text.6CategoryZReinstatement")}</span>
                <Badge variant={stateBadgeVariant(summary?.zState ?? "unknown")}>
                  {stateLabel(summary?.zState ?? "unknown", t)}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">

                {t("text.finalPostPrecommissioningReinstatementToCompleteHandoverReadiness")}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={currentOperation === "z_reinstatement" && currentMode === "preparation" ? "default" : "outline"}
                disabled={summary?.zState === "not_applicable"}
                onClick={() => openOp("z_reinstatement", "preparation")}
              >

                {t("text.assign")}
              </Button>
              <Button
                size="sm"
                variant={currentOperation === "z_reinstatement" && currentMode === "progress" ? "default" : "outline"}
                disabled={summary?.zState === "not_applicable"}
                onClick={() => openOp("z_reinstatement", "progress")}
              >

                {t("text.recordJoints")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Embedded operational section */}
      {currentOperation && activeRequestType && (
        <Card className="border-primary/40 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base capitalize">
                {t(`operation.${currentOperation}`)} · {t(`mode.${currentMode ?? "progress"}`)}
              </CardTitle>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onSelectOperation?.(null, null)}
            >

              {t("text.closeOperation")}
            </Button>
          </CardHeader>
          <CardContent data-operation-scroll="" className="max-h-[60vh] overflow-y-auto">
            {currentMode === "preparation" && activeRequestType !== "testing_precomm" ? (
              <RequestPreparationScreen
                requestType={activeRequestType as PressureTestRequestType}
                embedded={true}
                testPackId={pack.id}
                onRecorded={() => {
                  void workspace?.refresh()
                }}
              />
            ) : (
              <PressureTestProgressScreen
                requestType={activeRequestType}
                embedded={true}
                testPackId={pack.id}
                operation={currentOperation}
                onRecorded={() => {
                  void workspace?.refresh()
                }}
              />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
