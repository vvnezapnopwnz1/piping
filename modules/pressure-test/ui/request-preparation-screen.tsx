"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useMarkInputsRecorded, useRegisterUnsavedState } from "@/components/pipeqc/unsaved-input-guard"
import { withProject } from "@/components/pipeqc/project-url"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import { useSupabaseAuth } from "@/contexts/supabase-auth-context"
import { useOptionalAccess } from "@/modules/access/ui/access-context"
import { assignManagedItemClearance, assignManagedLineCheck } from "../application/manage-line-check"
import {
  assignBlinding,
  assignReinstatement,
  listProjectTeams,
  listPunchItems,
  listRequestDetails,
  listTestPackCatalog,
  listTestPackMembers,
  listTestPackReinstatementTargets,
  type FlangeJointReadinessRow,
  type ProjectTeamRow,
  type TestPackCatalogRow,
  type TestPackMemberRow,
} from "../infrastructure/supabase-pressure-test-repository"
import { getPressureTestRequestConfig, type PressureTestRequestType } from "./pressure-test-ui-model"
import { useOptionalTestPackWorkspaceContext } from "./test-pack-workspace-context"

interface Props {
  requestType: PressureTestRequestType
  title?: string
  description?: string
  progressHref?: string
  embedded?: boolean
  testPackId?: string
  onRecorded?: (requestId: string) => void
}

export function RequestPreparationScreen({
  requestType,
  title,
  description,
  progressHref,
  embedded = false,
  testPackId: propPackId,
  onRecorded,
}: Props) {
  const auth = useSupabaseAuth()
  const access = useOptionalAccess()
  const projectId = auth.access?.projectId
  const projectCode = auth.access?.activityCode
  const params = useSearchParams()
  const queryPackId = params.get("testPackId")
  const config = getPressureTestRequestConfig(requestType)
  const canManage = access?.can("testpack.manage") ?? false

  const effectivePackId = propPackId ?? queryPackId ?? ""
  const [selectedPack, setSelectedPack] = useState(effectivePackId)

  // Sync with query / prop changes on every change
  useEffect(() => {
    setSelectedPack(propPackId ?? queryPackId ?? "")
  }, [propPackId, queryPackId])

  const [packs, setPacks] = useState<TestPackCatalogRow[]>([])
  const [members, setMembers] = useState<TestPackMemberRow[]>([])
  const [punches, setPunches] = useState<Record<string, unknown>[]>([])
  const [flanges, setFlanges] = useState<FlangeJointReadinessRow[]>([])
  const [teams, setTeams] = useState<ProjectTeamRow[]>([])
  const [selectedTargets, setSelectedTargets] = useState<string[]>([])
  const [teamId, setTeamId] = useState("")
  const [assignedOn, setAssignedOn] = useState(new Date().toISOString().slice(0, 10))
  const [requestId, setRequestId] = useState<string | null>(null)
  const [requestNumber, setRequestNumber] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState(false)

  const pendingRef = useRef(false)
  const formRef = useRef<HTMLDivElement>(null)
  const markRecorded = useMarkInputsRecorded()
  const workspace = useOptionalTestPackWorkspaceContext()

  useRegisterUnsavedState(selectedTargets.length > 0)

  // Load catalogs and teams on project / teamType change.
  // Note: team is not auto-selected; operator chooses explicitly.
  useEffect(() => {
    if (!projectId) return
    let active = true
    const client = getSupabaseBrowserClient()
    const load = async () => {
      const [nextPacks, nextTeams] = await Promise.all([
        listTestPackCatalog(client, projectId),
        listProjectTeams(client, projectId, config.teamType),
      ])
      if (!active) return
      setPacks(nextPacks)
      setTeams(nextTeams)
    }
    void load()
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : "Could not load preparation data")
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [projectId, config.teamType])

  // Load scoped targets whenever selectedPack changes
  useEffect(() => {
    if (!projectId || !selectedPack) {
      setMembers([])
      setPunches([])
      setFlanges([])
      setSelectedTargets([])
      return
    }
    let active = true
    const client = getSupabaseBrowserClient()
    const load = async () => {
      if (requestType === "line_check") {
        const nextMembers = await listTestPackMembers(client, projectId, selectedPack)
        if (!active) return
        setMembers(nextMembers)
      } else if (requestType === "item_clearance") {
        const nextPunches = await listPunchItems(client, projectId, selectedPack)
        if (!active) return
        setPunches(nextPunches)
      } else if (requestType === "reinstatement") {
        const nextFlanges = await listTestPackReinstatementTargets(client, projectId, selectedPack)
        if (!active) return
        setFlanges(nextFlanges)
      }
      setSelectedTargets([])
    }
    void load().catch((cause) => {
      if (active) setError(cause instanceof Error ? cause.message : "Could not load scoped targets")
    })
    return () => {
      active = false
    }
  }, [projectId, selectedPack, requestType])

  const targets = useMemo(() => {
    if (requestType === "line_check") {
      return members
        .filter((member) => member.removed_at === null)
        .map((member) => ({
          id: member.isometric_id ?? "",
          label: member.iso_number ?? member.isometric_id ?? "",
        }))
    }
    if (requestType === "item_clearance") {
      return punches.map((punch) => ({
        id: String(punch.id ?? ""),
        label: `${String(punch.item_number ?? punch.id)} · ISO ${String(punch.isometric_id ?? "")}`,
      }))
    }
    if (requestType === "reinstatement") {
      return flanges.map((flange) => ({
        id: flange.flange_joint_revision_id ?? "",
        label: `${flange.category_code ?? "?"} · ${flange.flange_number ?? flange.flange_joint_revision_id}`,
      }))
    }
    return selectedPack
      ? [
          {
            id: selectedPack,
            label: packs.find((pack) => pack.id === selectedPack)?.testPackNumber ?? selectedPack,
          },
        ]
      : []
  }, [flanges, members, packs, punches, requestType, selectedPack])

  const toggle = (id: string, checked: boolean) =>
    setSelectedTargets((current) => (checked ? [...current, id] : current.filter((item) => item !== id)))

  const assign = async () => {
    if (!projectId || !selectedPack || !teamId || !canManage) return
    if (pendingRef.current) return
    pendingRef.current = true
    setPending(true)
    setError(null)

    const capturedPack = selectedPack
    const capturedTeam = teamId
    const capturedDate = assignedOn
    const capturedTargets = [...selectedTargets]

    const doAssign = async () => {
      const client = getSupabaseBrowserClient()
      let result: unknown
      const key = `browser-${requestType}-${capturedPack}-${Date.now()}`

      if (requestType === "line_check") {
        result = await assignManagedLineCheck(client, {
          testPackId: capturedPack,
          isometricIds: capturedTargets,
          teamId: capturedTeam,
          assignedDate: capturedDate,
        })
      } else if (requestType === "item_clearance") {
        result = await assignManagedItemClearance(client, {
          testPackId: capturedPack,
          punchItemIds: capturedTargets,
          teamId: capturedTeam,
          assignedDate: capturedDate,
        })
      } else if (requestType === "blinding") {
        result = await assignBlinding(client, capturedPack, capturedTeam, capturedDate, key)
      } else {
        result = await assignReinstatement(client, capturedPack, capturedTargets, capturedTeam, capturedDate, key)
      }

      const value = result as { ok?: boolean; value?: { id?: string }; errors?: Record<string, string> }
      if (value.ok === false) {
        setError(Object.values(value.errors ?? {}).join("; "))
        return
      }

      const id = value.value?.id ?? (value as { id?: string }).id
      if (id) {
        setRequestId(id)
        // Fetch request details to get the exact business number
        const details = await listRequestDetails(client, projectId, id).catch(() => null)
        const businessNo = details?.request_number ?? id.slice(0, 8)
        setRequestNumber(businessNo)
        toast.success(`Assigned ${config.title} request ${businessNo}.`)
        onRecorded?.(id)
      }

      setSelectedTargets([])
      if (formRef.current) {
        markRecorded(Array.from(formRef.current.querySelectorAll("input, select, textarea")))
      }

      if (workspace) {
        await workspace.refresh()
      }
    }

    try {
      if (workspace) {
        await workspace.runCommand(doAssign)
      } else {
        await doAssign()
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Assignment failed")
    } finally {
      pendingRef.current = false
      setPending(false)
    }
  }

  if (!projectId) return <p className="text-sm text-muted-foreground">Select a project to prepare a request.</p>
  if (loading) return <Skeleton className="h-64 w-full" />

  const printHref = requestId
    ? withProject(config.printPath.replace("{requestId}", requestId), projectCode)
    : null

  return (
    <div ref={formRef} className="space-y-6" data-explicit-unsaved-commit="true">
      {!embedded && (
        <div>
          <h1 className="text-2xl font-semibold">{title ?? config.title} · Preparation</h1>
          <p className="text-sm text-muted-foreground">{description ?? config.description}</p>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle>Assignment</CardTitle>
        </CardHeader>
        <CardContent className={`grid gap-4 ${embedded ? "sm:grid-cols-2" : "lg:grid-cols-3"}`}>
          {!embedded && (
            <label className="text-xs text-muted-foreground">
              Test Pack
              <select
                className="h-9 w-full rounded border bg-transparent px-3 text-sm mt-1"
                value={selectedPack}
                onChange={(event) => setSelectedPack(event.target.value)}
                disabled={loading || pending}
              >
                <option value="">Select a Test Pack</option>
                {packs.map((pack) => (
                  <option key={pack.id} value={pack.id}>
                    {pack.testPackNumber} · rev {pack.revisionNo}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="text-xs text-muted-foreground">
            Team *
            <select
              className="h-9 w-full rounded border bg-transparent px-3 text-sm mt-1"
              value={teamId}
              onChange={(event) => setTeamId(event.target.value)}
              disabled={!canManage || pending}
            >
              <option value="">Select a {config.teamType} team</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.code} · {team.description}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs text-muted-foreground">
            Assigned date *
            <Input
              type="date"
              className="mt-1"
              value={assignedOn}
              onChange={(event) => setAssignedOn(event.target.value)}
              disabled={!canManage || pending}
            />
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{config.targetLabel} targets</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {targets.map((target) => (
            <label key={target.id} className="flex items-center gap-2 rounded border p-2 text-sm">
              <input
                type="checkbox"
                checked={selectedTargets.includes(target.id)}
                onChange={(event) => toggle(target.id, event.target.checked)}
                disabled={!canManage || pending || requestType === "blinding"}
              />
              <span>{target.label}</span>
            </label>
          ))}

          {targets.length === 0 && (
            <p className="text-sm text-muted-foreground">No target of this test pack can be assigned yet.</p>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              type="button"
              onClick={() => void assign()}
              loading={pending}
              disabled={
                !canManage ||
                pending ||
                !teamId ||
                (requestType !== "blinding" && selectedTargets.length === 0)
              }
            >
              Assign request
            </Button>

            {progressHref && (
              <Link
                className="rounded border px-4 py-2 text-sm hover:bg-muted"
                href={`${progressHref}${selectedPack ? `?testPackId=${selectedPack}` : ""}`}
              >
                Open progress
              </Link>
            )}

            {printHref && (
              <Link className="rounded border px-4 py-2 text-sm hover:bg-muted" href={printHref}>
                Open printable request {requestNumber ?? requestId?.slice(0, 8)}
              </Link>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Eligibility is checked and a duplicate assignment refused when you assign; nothing is marked ready until it is recorded.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
