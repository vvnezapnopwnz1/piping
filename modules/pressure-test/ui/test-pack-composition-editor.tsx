"use client"

import { useEffect, useMemo, useState } from "react"
import { Plus, Trash2, ArrowRightLeft } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DataTable,
  useTableUrlState,
  type DataColumn,
} from "@/components/ui/data-table"
import { useRegisterUnsavedState } from "@/components/pipeqc/unsaved-input-guard"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import {
  composeManagedTestPack,
  moveManagedTestPackIsometric,
  removeManagedTestPackIsometric,
} from "../application/manage-test-pack"
import {
  listAvailableIsometricReadiness,
  listProjectIsometricNumbers,
  listTestPackCatalog,
  listTestPackMembers,
  type IsometricNumberRow,
  type IsometricReadinessRow,
  type TestPackCatalogRow,
  type TestPackMemberRow,
} from "../infrastructure/supabase-pressure-test-repository"
import type { CompositionAttempt } from "./test-pack-builder-model"
import { ConfirmAction, MoveIsoDialog } from "./test-pack-builder-parts"
import { isometricOptions, type IsometricOption } from "./test-pack-reference-model"
import { useOptionalTestPackWorkspaceContext } from "./test-pack-workspace-context"

export interface TestPackCompositionEditorProps {
  projectId: string
  pack: TestPackCatalogRow
  canManage: boolean
  dataCurrent: boolean
  onComposed?: () => void
}

const memberColumns: DataColumn<TestPackMemberRow>[] = [
  {
    id: "isoNumber",
    header: "ISO number",
    searchable: true,
    value: (row) => row.iso_number ?? row.isometric_id ?? "—",
  },
  {
    id: "sourceKind",
    header: "Source",
    value: (row) => row.source_kind ?? "manual",
  },
  {
    id: "assignedAt",
    header: "Assigned at",
    value: (row) => row.assigned_at ?? "—",
    filter: "date",
  },
]

export function TestPackCompositionEditor({
  projectId,
  pack,
  canManage,
  dataCurrent,
  onComposed,
}: TestPackCompositionEditorProps) {
  const workspace = useOptionalTestPackWorkspaceContext()
  const [members, setMembers] = useState<TestPackMemberRow[]>(
    () => workspace?.snapshot?.members ?? [],
  )
  const [available, setAvailable] = useState<IsometricReadinessRow[]>([])
  const [isoNumbers, setIsoNumbers] = useState<IsometricNumberRow[]>([])
  const [catalogPacks, setCatalogPacks] = useState<TestPackCatalogRow[]>([])
  const [selectedAvailable, setSelectedAvailable] = useState<string[]>([])
  const [pendingRemoval, setPendingRemoval] = useState<TestPackMemberRow | null>(null)
  const [pendingMove, setPendingMove] = useState<TestPackMemberRow | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [attemptResult, setAttemptResult] = useState<CompositionAttempt | null>(null)

  const [memberTable, setMemberTable] = useTableUrlState({ namespace: "cmem" })
  const [availableTable, setAvailableTable] = useTableUrlState({ namespace: "ciso" })

  useRegisterUnsavedState(selectedAvailable.length > 0)

  // Keep members in sync with workspace snapshot
  useEffect(() => {
    if (workspace?.snapshot?.members) {
      setMembers(workspace.snapshot.members)
    }
  }, [workspace?.snapshot?.members])

  // Load available ISO candidates and catalog packs for destination move
  useEffect(() => {
    let active = true
    const client = getSupabaseBrowserClient()
    void Promise.all([
      listAvailableIsometricReadiness(client, projectId),
      listProjectIsometricNumbers(client, projectId),
      listTestPackCatalog(client, projectId),
    ]).then(([nextAvailable, nextIsoNumbers, nextCatalog]) => {
      if (!active) return
      setAvailable(nextAvailable)
      setIsoNumbers(nextIsoNumbers)
      setCatalogPacks(nextCatalog)
    })
    return () => {
      active = false
    }
  }, [projectId])

  const activeMembers = useMemo(
    () => members.filter((m) => m.removed_at === null),
    [members],
  )
  const currentMemberIsoIds = useMemo(
    () => new Set(activeMembers.map((m) => m.isometric_id).filter(Boolean)),
    [activeMembers],
  )

  const options: IsometricOption[] = useMemo(() => {
    const all = isometricOptions(available, isoNumbers)
    return all.filter((opt) => !currentMemberIsoIds.has(opt.id))
  }, [available, isoNumbers, currentMemberIsoIds])

  const moveDestinations = useMemo(
    () =>
      catalogPacks
        .filter((p) => p.id !== pack.id && p.lifecycle !== "archived")
        .map((p) => ({ id: p.id, label: p.testPackNumber })),
    [catalogPacks, pack.id],
  )

  const isArchived = pack.lifecycle === "archived"
  const editable = canManage && !isArchived

  const toggleAvailable = (isoId: string) => {
    setSelectedAvailable((current) =>
      current.includes(isoId) ? current.filter((id) => id !== isoId) : [...current, isoId],
    )
  }

  const availableColumns: DataColumn<IsometricOption>[] = [
    {
      id: "select",
      header: "Add",
      sortable: false,
      alwaysVisible: true,
      value: (option) => selectedAvailable.includes(option.id),
      filter: "boolean",
      headerClassName: "w-14",
      cell: (option) => (
        <Checkbox
          aria-label={`Add ${option.label}`}
          checked={selectedAvailable.includes(option.id)}
          disabled={!editable}
          onCheckedChange={() => toggleAvailable(option.id)}
        />
      ),
    },
    {
      id: "label",
      header: "ISO number",
      searchable: true,
      value: (row) => row.label,
    },
    {
      id: "status",
      header: "Readiness",
      value: (row) => (row.isRft ? "Ready For Test" : "Ongoing"),
      filter: "select",
    },
  ]

  const onAddSelected = async () => {
    if (!editable || submitting || selectedAvailable.length === 0) return
    setSubmitting(true)
    setError(null)
    setAttemptResult(null)

    const doCompose = async () => {
      const client = getSupabaseBrowserClient()
      const confirmedIsoIds: string[] = []
      const remainingIsoIds: string[] = []
      let failedError: string | null = null

      for (const isoId of selectedAvailable) {
        try {
          await composeManagedTestPack(client, pack.id, isoId)
          confirmedIsoIds.push(isoId)
        } catch (cause) {
          remainingIsoIds.push(isoId)
          if (!failedError) {
            failedError = cause instanceof Error ? cause.message : "Failed to compose isometric"
          }
        }
      }

      if (remainingIsoIds.length > 0) {
        setAttemptResult({
          testPackId: pack.id,
          confirmedIsoIds,
          remainingIsoIds,
          failure: failedError,
        })
        setSelectedAvailable(remainingIsoIds)
        toast.warning(
          `Partially composed: ${confirmedIsoIds.length} added, ${remainingIsoIds.length} failed.`,
        )
      } else {
        toast.success(`Added ${confirmedIsoIds.length} isometric(s) to ${pack.testPackNumber}.`)
        setSelectedAvailable([])
      }

      // Refresh data
      if (workspace) {
        await workspace.refresh()
      } else {
        const nextMembers = await listTestPackMembers(client, projectId, pack.id)
        setMembers(nextMembers)
      }
      const nextAvailable = await listAvailableIsometricReadiness(client, projectId)
      setAvailable(nextAvailable)
      onComposed?.()
    }

    try {
      if (workspace) {
        await workspace.runCommand(doCompose)
      } else {
        await doCompose()
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to compose Test Pack")
    } finally {
      setSubmitting(false)
    }
  }

  const onConfirmRemove = async () => {
    if (!pendingRemoval || !editable || submitting) return
    setSubmitting(true)
    setError(null)

    const member = pendingRemoval
    const doRemove = async () => {
      const client = getSupabaseBrowserClient()
      await removeManagedTestPackIsometric(
        client,
        pack.id,
        member.isometric_id ?? "",
      )
      toast.success(`Removed ISO ${member.iso_number ?? member.isometric_id} from ${pack.testPackNumber}.`)
      if (workspace) {
        await workspace.refresh()
      } else {
        const nextMembers = await listTestPackMembers(client, projectId, pack.id)
        setMembers(nextMembers)
      }
      const nextAvailable = await listAvailableIsometricReadiness(client, projectId)
      setAvailable(nextAvailable)
      onComposed?.()
    }

    try {
      if (workspace) {
        await workspace.runCommand(doRemove)
      } else {
        await doRemove()
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to remove ISO")
    } finally {
      setSubmitting(false)
      setPendingRemoval(null)
    }
  }

  const onConfirmMove = async (destinationId: string) => {
    if (!pendingMove || !editable || submitting) return
    setSubmitting(true)
    setError(null)

    const member = pendingMove
    const doMove = async () => {
      const client = getSupabaseBrowserClient()
      await moveManagedTestPackIsometric(
        client,
        pack.id,
        member.isometric_id ?? "",
        destinationId,
      )
      toast.success(`Moved ISO ${member.iso_number ?? member.isometric_id}.`)
      if (workspace) {
        await workspace.refresh()
      } else {
        const nextMembers = await listTestPackMembers(client, projectId, pack.id)
        setMembers(nextMembers)
      }
      const nextCatalog = await listTestPackCatalog(client, projectId)
      setCatalogPacks(nextCatalog)
      onComposed?.()
    }

    try {
      if (workspace) {
        await workspace.runCommand(doMove)
      } else {
        await doMove()
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to move ISO")
    } finally {
      setSubmitting(false)
      setPendingMove(null)
    }
  }

  return (
    <div className="space-y-6" data-explicit-unsaved-commit="true">
      {error && <p className="text-sm text-destructive">{error}</p>}
      {!dataCurrent && (
        <p className="rounded border border-amber-200 bg-amber-50 p-2 text-sm text-amber-900">
          Data is stale; retry refresh before modifying composition.
        </p>
      )}

      {attemptResult?.failure && (
        <div className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 space-y-1">
          <p className="font-medium">Partial Composition Result</p>
          <p>Confirmed added ISOs: {attemptResult.confirmedIsoIds.length}</p>
          <p>Remaining unadded ISOs: {attemptResult.remainingIsoIds.length}</p>
          <Button
            size="sm"
            variant="outline"
            disabled={!editable || submitting}
            onClick={() => void onAddSelected()}
          >
            Retry adding remaining ISOs
          </Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Current ISO Members ({activeMembers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            rows={activeMembers}
            columns={[
              ...memberColumns,
              {
                id: "actions",
                header: "Actions",
                value: () => null,
                cell: (row) =>
                  editable ? (
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        title="Move ISO to another pack"
                        disabled={submitting}
                        onClick={() => setPendingMove(row)}
                      >
                        <ArrowRightLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        title="Remove ISO from pack"
                        disabled={submitting}
                        onClick={() => setPendingRemoval(row)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : null,
              },
            ]}
            rowId={(row) => String(row.id)}
            state={memberTable}
            onStateChange={setMemberTable}
            emptyTitle="No isometrics currently assigned to this Test Pack."
          />
        </CardContent>
      </Card>

      {editable && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle>Available Candidate ISOs</CardTitle>
              <p className="text-sm text-muted-foreground">
                Select candidate isometrics to add to this pack.
              </p>
            </div>
            <Button
              type="button"
              disabled={!editable || submitting || selectedAvailable.length === 0}
              loading={submitting}
              onClick={() => void onAddSelected()}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add selected ({selectedAvailable.length})
            </Button>
          </CardHeader>
          <CardContent>
            <DataTable
              rows={options}
              columns={availableColumns}
              rowId={(option) => option.id}
              state={availableTable}
              onStateChange={setAvailableTable}
              emptyTitle="No candidate isometrics available for assignment."
            />
          </CardContent>
        </Card>
      )}

      <ConfirmAction
        open={pendingRemoval !== null}
        onOpenChange={(open) => !open && setPendingRemoval(null)}
        title={`Remove ISO ${pendingRemoval?.iso_number ?? pendingRemoval?.isometric_id}?`}
        description="Removing this isometric drops its spools from the test pack. The server refuses if workflow evidence exists."
        confirmLabel="Remove ISO"
        destructive
        onConfirm={() => void onConfirmRemove()}
      />

      <MoveIsoDialog
        isoNumber={pendingMove?.iso_number ?? pendingMove?.isometric_id ?? ""}
        destinations={moveDestinations}
        open={pendingMove !== null}
        onOpenChange={(open) => !open && setPendingMove(null)}
        onMove={(destId) => void onConfirmMove(destId)}
      />
    </div>
  )
}
