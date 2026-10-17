"use client"

import { useTestPackTranslations, testPackValidationMessages, reportTestPackError } from "@/modules/pressure-test/ui/test-pack-i18n"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useMarkInputsRecorded, useRegisterUnsavedState } from "@/components/pipeqc/unsaved-input-guard"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import { useSupabaseAuth } from "@/contexts/supabase-auth-context"
import { useOptionalAccess } from "@/modules/access/ui/access-context"
import { recordManagedLineCheckResult } from "../application/manage-line-check"
import { recordManagedPressureTestStage } from "../application/manage-pressure-test"
import {
  listBlindingWorklist,
  listItemClearanceWorklist,
  listLineCheckWorklist,
  listProjectPunchCodes,
  listProjectTeams,
  listReinstatementWorklist,
  listAvailableOperations,
  listTestingPrecommWorklist,
  recordBlinding,
  recordPunchClearance,
  recordReinstatement,
  type BlindingWorklistRow,
  type ItemClearanceWorklistRow,
  type LineCheckWorklistRow,
  type ProjectReferenceOptionRow,
  type ProjectTeamRow,
  type ReinstatementWorklistRow,
  type TestingPrecommWorklistRow,
} from "../infrastructure/supabase-pressure-test-repository"
import { toReferenceOptions } from "./test-pack-reference-model"
import { getPressureTestRequestConfig, type PressureTestRequestType } from "./pressure-test-ui-model"
import { targetDraftKey, type TestPackOperation } from "./test-pack-workspace-model"
import { useOptionalTestPackWorkspaceContext } from "./test-pack-workspace-context"

interface Props {
  requestType: PressureTestRequestType | "testing_precomm"
  title?: string
  description?: string
  embedded?: boolean
  testPackId?: string
  operation?: TestPackOperation
  onRecorded?: () => void
}

type LineDraft = { date: string; punchCodeId: string; description: string }
type ReinstatementDraft = { date: string; reportNumber: string; tagNumber: string }

// A pack can have each pressure-test stage only once.  Keep its retry key stable
// even when the browser loses the response and the operator clicks again.
const stageIdempotencyKey = (testPackId: string, stage: string) =>
  `browser-pressure-test-stage-${testPackId}-${stage}`

// The server decides when a pack can move on (test_pack_workflow.available_operations); the list only shows these.
const TESTING_STEP_OPERATIONS = ["testing_start", "testing_complete", "precommissioning"]

export function PressureTestProgressScreen({
  requestType,
  title,
  description,
  embedded = false,
  testPackId: propPackId,
  operation: _operation,
  onRecorded,
}: Props) {
  const t = useTestPackTranslations()

  const auth = useSupabaseAuth()
  const access = useOptionalAccess()
  const projectId = auth.access?.projectId
  const params = useSearchParams()
  const queryPackId = params.get("testPackId")
  const canManage = access?.can("testpack.manage") ?? false

  const effectivePackId = propPackId ?? queryPackId ?? undefined

  const [lineRows, setLineRows] = useState<LineCheckWorklistRow[]>([])
  const [clearanceRows, setClearanceRows] = useState<ItemClearanceWorklistRow[]>([])
  const [blindingRows, setBlindingRows] = useState<BlindingWorklistRow[]>([])
  const [testingRows, setTestingRows] = useState<TestingPrecommWorklistRow[]>([])
  const [availableOperations, setAvailableOperations] = useState<Record<string, string[]>>({})
  const [reinstatementRows, setReinstatementRows] = useState<ReinstatementWorklistRow[]>([])
  const [teams, setTeams] = useState<ProjectTeamRow[]>([])
  const [punchCodes, setPunchCodes] = useState<ProjectReferenceOptionRow[]>([])
  const [drafts, setDrafts] = useState<Record<string, LineDraft>>({})
  const [reinstatementDrafts, setReinstatementDrafts] = useState<Record<string, ReinstatementDraft>>({})
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [teamId, setTeamId] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState(false)

  const pendingRef = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const markRecorded = useMarkInputsRecorded()
  const workspace = useOptionalTestPackWorkspaceContext()

  const config = requestType === "testing_precomm" ? null : getPressureTestRequestConfig(requestType)

  const hasDrafts = Object.values(drafts).some(
    (d) => d.punchCodeId.trim() !== "" || d.description.trim() !== "",
  ) || Object.values(reinstatementDrafts).some(
    (d) => d.reportNumber.trim() !== "" || d.tagNumber.trim() !== "",
  )
  useRegisterUnsavedState(hasDrafts)

  const load = async () => {
    if (!projectId) return
    const client = getSupabaseBrowserClient()
    if (requestType === "line_check") {
      setLineRows(await listLineCheckWorklist(client, projectId, effectivePackId))
      setPunchCodes(await listProjectPunchCodes(client, projectId))
    }
    if (requestType === "item_clearance") {
      setClearanceRows(await listItemClearanceWorklist(client, projectId, effectivePackId))
    }
    if (requestType === "blinding") {
      setBlindingRows(await listBlindingWorklist(client, projectId, effectivePackId))
    }
    if (requestType === "testing_precomm") {
      setTestingRows(await listTestingPrecommWorklist(client, projectId, effectivePackId))
      setAvailableOperations(await listAvailableOperations(client, projectId))
    }
    if (requestType === "reinstatement") {
      const nextTeams = await listProjectTeams(client, projectId, "jointer")
      setReinstatementRows(await listReinstatementWorklist(client, projectId, effectivePackId))
      setTeams(nextTeams)
      setTeamId((current) => current || nextTeams[0]?.id || "")
    } else if (requestType !== "testing_precomm") {
      setTeams(await listProjectTeams(client, projectId, config?.teamType))
    }
  }

  useEffect(() => {
    setLoading(true)
    setError(null)
    void load()
      .catch((cause) => setError(reportTestPackError(cause, t("text.couldNotLoadProgressWorklist"))))
      .finally(() => setLoading(false))
  }, [projectId, requestType, effectivePackId])

  const heading = title ?? (requestType === "testing_precomm" ? t("text.testingPreCommissioning") : (config ? t(config.title) : t("text.progress")))

  const saveLine = async (row: LineCheckWorklistRow) => {
    if (!canManage || pendingRef.current) return
    const key = targetDraftKey(row.request_id ?? "", row.isometric_id ?? "")
    const draft = drafts[key] ?? { date, punchCodeId: "", description: "" }
    pendingRef.current = true
    setPending(true)
    setError(null)

    const doSave = async () => {
      const punches = draft.punchCodeId.trim() ? [
        {
          testPackId: row.test_pack_id ?? "",
          isometricId: row.isometric_id ?? "",
          punchCodeId: draft.punchCodeId,
          description: draft.description,
          checkingDate: draft.date,
        },
      ] : []
      const result = await recordManagedLineCheckResult(
        getSupabaseBrowserClient(),
        row.request_id ?? "",
        row.isometric_id ?? "",
        draft.date,
        punches,
      )
      if (!result.ok) {
        setError(testPackValidationMessages(result.errors, t))
        return
      }
      toast.success(t("text.lineCheckResultSavedReadinessProjectionReloaded"))
      if (containerRef.current) {
        markRecorded(Array.from(containerRef.current.querySelectorAll("input, select, textarea")))
      }
      await load()
      if (workspace) await workspace.refresh()
      onRecorded?.()
    }

    try {
      if (workspace) await workspace.runCommand(doSave)
      else await doSave()
    } catch (cause) {
      setError(reportTestPackError(cause, t("text.lineCheckResultFailed")))
    } finally {
      pendingRef.current = false
      setPending(false)
    }
  }

  const clearPunch = async (row: ItemClearanceWorklistRow) => {
    if (!canManage || pendingRef.current) return
    pendingRef.current = true
    setPending(true)
    setError(null)

    const doClear = async () => {
      await recordPunchClearance(
        getSupabaseBrowserClient(),
        row.request_id ?? "",
        row.punch_item_id ?? "",
        date,
        `browser-clear-${row.punch_item_id}-${date}`,
      )
      toast.success(t("text.punchClearanceSavedReadinessProjectionReloaded"))
      await load()
      if (workspace) await workspace.refresh()
      onRecorded?.()
    }

    try {
      if (workspace) await workspace.runCommand(doClear)
      else await doClear()
    } catch (cause) {
      setError(reportTestPackError(cause, t("text.punchClearanceFailed")))
    } finally {
      pendingRef.current = false
      setPending(false)
    }
  }

  const completeBlind = async (row: BlindingWorklistRow) => {
    if (!canManage || pendingRef.current) return
    pendingRef.current = true
    setPending(true)
    setError(null)

    const doBlind = async () => {
      await recordBlinding(
        getSupabaseBrowserClient(),
        row.request_id ?? "",
        date,
        `browser-blinding-complete-${row.request_id}-${date}`,
      )
      toast.success(t("text.blindingCompletionSaved"))
      await load()
      if (workspace) await workspace.refresh()
      onRecorded?.()
    }

    try {
      if (workspace) await workspace.runCommand(doBlind)
      else await doBlind()
    } catch (cause) {
      setError(reportTestPackError(cause, t("text.blindingCompletionFailed")))
    } finally {
      pendingRef.current = false
      setPending(false)
    }
  }

  const recordStage = async (row: TestingPrecommWorklistRow) => {
    if (!canManage || pendingRef.current) return
    pendingRef.current = true
    setPending(true)
    setError(null)

    const stage =
      row.testing_started_on === null
        ? "testing_started"
        : row.testing_completed_on === null
          ? "testing_completed"
          : "precommissioning_completed"

    const doStage = async () => {
      const result = await recordManagedPressureTestStage(
        getSupabaseBrowserClient(),
        row.test_pack_id ?? "",
        row.testing_started_on === null
          ? "blinded"
          : row.testing_completed_on === null
            ? "testing"
            : "ready_for_precommissioning",
        stage,
        date,
        stageIdempotencyKey(row.test_pack_id ?? "", stage),
      )
      if (!result.ok) {
        setError(testPackValidationMessages(result.errors, t))
        return
      }
      toast.success(t("text.0Saved", { v1: (t(`event.${stage}`)) ?? "—" }))
      await load()
      if (workspace) await workspace.refresh()
      onRecorded?.()
    }

    try {
      if (workspace) await workspace.runCommand(doStage)
      else await doStage()
    } catch (cause) {
      setError(reportTestPackError(cause, t("text.stageEventFailed")))
    } finally {
      pendingRef.current = false
      setPending(false)
    }
  }

  const completeReinstatement = async (row: ReinstatementWorklistRow) => {
    if (!canManage || pendingRef.current) return
    const key = targetDraftKey(row.request_id ?? "", row.flange_joint_revision_id ?? "")
    const draft = reinstatementDrafts[key] ?? { date, reportNumber: "", tagNumber: "" }

    if (!draft.reportNumber.trim()) {
      setError(t("text.reportNumberIsRequiredToRecordFlangeReinstatement"))
      return
    }
    if (!draft.tagNumber.trim()) {
      setError(t("text.tagNumberIsRequiredToRecordFlangeReinstatement"))
      return
    }

    pendingRef.current = true
    setPending(true)
    setError(null)

    const doReinstatement = async () => {
      await recordReinstatement(
        getSupabaseBrowserClient(),
        row.request_id ?? "",
        row.flange_joint_revision_id ?? "",
        draft.date,
        draft.reportNumber,
        teamId,
        draft.tagNumber,
        `browser-reinstatement-complete-${row.flange_joint_revision_id}-${draft.date}`,
      )
      toast.success(t("text.reinstatementResultSaved"))
      if (containerRef.current) {
        markRecorded(Array.from(containerRef.current.querySelectorAll("input, select, textarea")))
      }
      await load()
      if (workspace) await workspace.refresh()
      onRecorded?.()
    }

    try {
      if (workspace) await workspace.runCommand(doReinstatement)
      else await doReinstatement()
    } catch (cause) {
      setError(reportTestPackError(cause, t("text.reinstatementFailed")))
    } finally {
      pendingRef.current = false
      setPending(false)
    }
  }

  const updateDraft = (key: string, field: keyof LineDraft, value: string) =>
    setDrafts((current) => ({
      ...current,
      [key]: { ...(current[key] ?? { date, punchCodeId: "", description: "" }), [field]: value },
    }))

  const updateReinstatementDraft = (key: string, field: keyof ReinstatementDraft, value: string) =>
    setReinstatementDrafts((current) => ({
      ...current,
      [key]: { ...(current[key] ?? { date, reportNumber: "", tagNumber: "" }), [field]: value },
    }))

  if (!projectId) return <p className="text-sm text-muted-foreground">{t("text.selectAProjectToViewProgress")}</p>
  if (loading) return <Skeleton className="h-64 w-full" />

  return (
    <div ref={containerRef} className="space-y-6" data-explicit-unsaved-commit="true">
      {!embedded && (
        <div>
          <h1 className="text-2xl font-semibold">{heading}  {t("text.progress26")}</h1>
          <p className="text-sm text-muted-foreground">
            {description ?? (config ? t(config.description) : t("text.recordTheNextPermittedDurableWorkflowEvent"))}
          </p>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <label className="block max-w-xs text-xs text-muted-foreground">

        {t("text.eventDate")}
        <Input
          type="date"
          className="mt-1"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          disabled={!canManage || pending}
        />
      </label>
      <p className="text-xs text-muted-foreground">

        {t("text.thisDateAppliesToWhicheverRowActionYou")}
      </p>

      <Card>
        <CardHeader>
          <CardTitle>{t("text.serverWorklist")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {requestType === "line_check" &&
            lineRows.map((row) => {
              const draftKey = targetDraftKey(row.request_id ?? "", row.isometric_id ?? "")
              const draft = drafts[draftKey] ?? { date, punchCodeId: "", description: "" }
              return (
                <div
                  key={`${row.request_id}-${row.isometric_id}`}
                  className="rounded border p-3 text-sm"
                >
                  <div className="flex justify-between font-medium">
                    <span>
                      {row.request_number}  {t("text.iso")} {row.iso_number ?? row.isometric_id}
                    </span>
                    <span>{row.result_id ? t("text.completed") : t("text.open33")}</span>
                  </div>
                  {!row.result_id && (
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      <Input
                        type="date"
                        value={draft.date}
                        onChange={(event) => updateDraft(draftKey, "date", event.target.value)}
                        disabled={!canManage || pending}
                      />
                      <label className="text-xs text-muted-foreground">

                        {t("text.punchCodeOptional")}
                        <select
                          className="h-9 w-full rounded border bg-transparent px-3 text-sm mt-1"
                          value={draft.punchCodeId}
                          onChange={(event) =>
                            updateDraft(draftKey, "punchCodeId", event.target.value)
                          }
                          disabled={!canManage || pending || punchCodes.length === 0}
                        >
                          <option value="">
                            {punchCodes.length === 0
                              ? t("text.noActivePunchCodesInThisProject")
                              : t("text.noPunch")}
                          </option>
                          {toReferenceOptions(punchCodes).map((option) => (
                            <option key={option.id} value={option.id}>{option.label}</option>
                          ))}
                        </select>
                      </label>
                      <Input
                        placeholder={t("text.punchDescription")}
                        value={draft.description}
                        onChange={(event) =>
                          updateDraft(draftKey, "description", event.target.value)
                        }
                        disabled={!canManage || pending}
                      />
                      <Button
                        type="button"
                        onClick={() => void saveLine(row)}
                        disabled={!canManage || pending}
                        loading={pending}
                      >

                        {t("text.completeLineCheck")}
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}

          {requestType === "item_clearance" &&
            clearanceRows.map((row) => (
              <div
                key={`${row.request_id}-${row.punch_item_id}`}
                className="flex items-center justify-between rounded border p-3 text-sm"
              >
                <span>
                  {row.request_number}  {t("text.punch")} {row.item_number ?? row.punch_item_id}
                </span>
                <span className="flex items-center gap-2">
                  {row.clearance_id ? (
                    t("text.cleared")
                  ) : (
                    <Button
                      type="button"
                      onClick={() => void clearPunch(row)}
                      disabled={!canManage || pending}
                      loading={pending}
                    >

                      {t("text.clear")}
                    </Button>
                  )}
                </span>
              </div>
            ))}

          {requestType === "blinding" &&
            blindingRows.map((row) => (
              <div
                key={row.request_id}
                className="flex items-center justify-between rounded border p-3 text-sm"
              >
                <span>{row.request_number}</span>
                <span>
                  {row.record_id ? (
                    t("text.completed")
                  ) : (
                    <Button
                      type="button"
                      onClick={() => void completeBlind(row)}
                      disabled={!canManage || pending}
                      loading={pending}
                    >

                      {t("text.completeBlinding")}
                    </Button>
                  )}
                </span>
              </div>
            ))}

          {requestType === "testing_precomm" &&
            testingRows.map((row) => (
              <div
                key={row.test_pack_id}
                className="flex items-center justify-between rounded border p-3 text-sm"
              >
                <span>{t("text.testPack")} {row.test_pack_number ?? row.test_pack_id}</span>
                <span>
                  {row.precommissioning_completed_on ? (
                    t("text.complete")
                  ) : !(availableOperations[row.test_pack_id ?? ""] ?? []).some((op) => TESTING_STEP_OPERATIONS.includes(op)) ? (
                    <span className="text-muted-foreground">{t("text.waitingForPreviousStep")}</span>
                  ) : (
                    <Button
                      type="button"
                      onClick={() => void recordStage(row)}
                      disabled={!canManage || pending}
                      loading={pending}
                    >
                      {row.testing_started_on === null
                        ? t("text.startTesting")
                        : row.testing_completed_on === null
                          ? t("text.completeTesting")
                          : t("text.completePreCommissioning")}
                    </Button>
                  )}
                </span>
              </div>
            ))}

          {requestType === "reinstatement" &&
            reinstatementRows.map((row) => {
              const draftKey = targetDraftKey(row.request_id ?? "", row.flange_joint_revision_id ?? "")
              const draft = reinstatementDrafts[draftKey] ?? { date, reportNumber: "", tagNumber: "" }
              return (
                <div
                  key={`${row.request_id}-${row.flange_joint_revision_id}`}
                  className="rounded border p-3 text-sm"
                >
                  <div className="flex justify-between font-medium">
                    <span>
                      {row.request_number} · {row.category_snapshot} ·{" "}
                      {row.flange_number ?? row.flange_joint_revision_id}
                    </span>
                    <span>{row.record_id ? t("text.completed") : t("text.open33")}</span>
                  </div>
                  {!row.record_id && (
                    <div className="mt-3 grid gap-2 sm:grid-cols-4">
                      <Input
                        type="date"
                        value={draft.date}
                        onChange={(event) =>
                          updateReinstatementDraft(draftKey, "date", event.target.value)
                        }
                        disabled={!canManage || pending}
                      />
                      <Input
                        placeholder={t("text.reportNumber")}
                        value={draft.reportNumber}
                        onChange={(event) =>
                          updateReinstatementDraft(draftKey, "reportNumber", event.target.value)
                        }
                        disabled={!canManage || pending}
                      />
                      <select
                        className="h-9 rounded border bg-transparent px-3 text-sm"
                        value={teamId}
                        onChange={(event) => setTeamId(event.target.value)}
                        disabled={!canManage || pending}
                      >
                        {teams.map((team) => (
                          <option key={team.id} value={team.id}>
                            {team.code}
                          </option>
                        ))}
                      </select>
                      <Input
                        placeholder={t("text.tagNumber")}
                        value={draft.tagNumber}
                        onChange={(event) =>
                          updateReinstatementDraft(draftKey, "tagNumber", event.target.value)
                        }
                        disabled={!canManage || pending}
                      />
                      <Button
                        type="button"
                        onClick={() => void completeReinstatement(row)}
                        disabled={!canManage || !teamId || pending}
                        loading={pending}
                      >

                        {t("text.recordJoint")}
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}

          {lineRows.length +
            clearanceRows.length +
            blindingRows.length +
            testingRows.length +
            reinstatementRows.length ===
            0 && (
            <p className="text-sm text-muted-foreground">

              {t("text.noServerWorklistRowsForThisProjectFilter")}
            </p>
          )}
        </CardContent>
      </Card>

      {!embedded && (
        <Link className="underline text-sm" href="/testpack">

          {t("text.returnToTestPacks")}
        </Link>
      )}
    </div>
  )
}
