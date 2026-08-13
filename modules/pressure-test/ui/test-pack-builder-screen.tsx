"use client"

import { useEffect, useMemo, useState, type FormEvent } from "react"
import { Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DataTable,
  RecordSelectTable,
  useTableUrlState,
  type DataColumn,
} from "@/components/ui/data-table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { StatusBadge } from "@/components/ui/status-badge"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import {
  archiveManagedTestPack,
  composeManagedTestPack,
  createManagedTestPack,
  moveManagedTestPackIsometric,
  removeManagedTestPackIsometric,
  updateManagedTestPack,
} from "../application/manage-test-pack"
import {
  listAvailableIsometricReadiness,
  listProjectIsometricNumbers,
  listProjectLineServices,
  listProjectServiceClasses,
  listProjectSubsystems,
  listProjectSystems,
  listTestPackCatalog,
  listTestPackMembers,
  type IsometricNumberRow,
  type IsometricReadinessRow,
  type ProjectReferenceOptionRow,
  type ProjectSubsystemOptionRow,
  type TestPackCatalogRow,
  type TestPackMemberRow,
} from "../infrastructure/supabase-pressure-test-repository"
import {
  isometricOptions,
  keepSelectedOption,
  subsystemOptionsForSystem,
  toReferenceOptions,
  type IsometricOption,
  type ReferenceOption,
} from "./test-pack-reference-model"
import {
  TEST_PACK_FIELDS,
  TEST_PACK_MEDIA,
  TEST_PACK_PRIORITIES,
  TEST_PACK_REFERENCE_FIELDS,
  mediumLabel,
  missingRequiredFields,
} from "./test-pack-builder-model"
import { ConfirmAction, FieldSelect, MoveIsoDialog } from "./test-pack-builder-parts"

type FormState = {
  testPackNumber: string
  location: string
  priority: string
  medium: string
  pressure: string
  volumeM3: string
  plannedStartOn: string
  plannedEndOn: string
  systemId: string
  subsystemId: string
  serviceClassId: string
  lineServiceId: string
}

const emptyForm: FormState = {
  testPackNumber: "",
  location: "",
  priority: "Normal",
  medium: "P",
  pressure: "",
  volumeM3: "",
  plannedStartOn: "",
  plannedEndOn: "",
  systemId: "",
  subsystemId: "",
  serviceClassId: "",
  lineServiceId: "",
}

/**
 * Kept for the field-shape test that pins the Track 12 fix: the four project references are chosen
 * from project-scoped lists, never typed as ids.
 */
const TEXT_FIELDS = TEST_PACK_FIELDS.map((item) => item.field)
const REFERENCE_FIELDS = TEST_PACK_REFERENCE_FIELDS

function toInput(form: FormState, isoIds: string[]) {
  return {
    ...form,
    pressure: Number(form.pressure),
    volumeM3: form.volumeM3 ? Number(form.volumeM3) : undefined,
    isoIds,
  }
}

/**
 * The Test Pack catalogue, as something a presenter can search rather than scroll. It used to be a
 * column of eighteen-rem buttons showing only the number, the revision and an ISO count, with the
 * "New Test Pack" button underneath all of them.
 */
const PACK_COLUMNS: ReadonlyArray<DataColumn<TestPackCatalogRow>> = [
  {
    id: "testPackNumber",
    header: "Test Pack",
    value: (pack) => pack.testPackNumber,
    searchable: true,
    filter: "text",
    pinned: true,
    alwaysVisible: true,
    className: "font-mono text-xs",
  },
  {
    id: "lifecycle",
    header: "Lifecycle",
    value: (pack) => pack.lifecycle,
    filter: "select",
    cell: (pack) => <StatusBadge status={pack.lifecycle} />,
  },
  { id: "activeIsoCount", header: "ISO", numeric: true, value: (pack) => pack.activeIsoCount, filter: "number" },
  { id: "revisionNo", header: "Rev", numeric: true, value: (pack) => pack.revisionNo },
  { id: "location", header: "Location", value: (pack) => pack.location, searchable: true, filter: "select" },
  { id: "priority", header: "Priority", value: (pack) => pack.priority, filter: "select" },
  {
    id: "medium",
    header: "Medium",
    value: (pack) => mediumLabel(pack.medium),
    filter: "select",
  },
  { id: "plannedStartOn", header: "Planned start", value: (pack) => pack.plannedStartOn, filter: "date" },
]

export function TestPackBuilderScreen({
  projectId,
  canManage,
}: {
  projectId: string
  canManage: boolean
}) {
  const [packs, setPacks] = useState<TestPackCatalogRow[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [members, setMembers] = useState<TestPackMemberRow[]>([])
  const [available, setAvailable] = useState<IsometricReadinessRow[]>([])
  const [isoNumbers, setIsoNumbers] = useState<IsometricNumberRow[]>([])
  const [systems, setSystems] = useState<ProjectReferenceOptionRow[]>([])
  const [subsystems, setSubsystems] = useState<ProjectSubsystemOptionRow[]>([])
  const [serviceClasses, setServiceClasses] = useState<ProjectReferenceOptionRow[]>([])
  const [lineServices, setLineServices] = useState<ProjectReferenceOptionRow[]>([])
  const [selectedAvailable, setSelectedAvailable] = useState<string[]>([])
  const [form, setForm] = useState<FormState>(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  // Browsing the catalogue has to take the definition form and both ISO lists with it: they are
  // about the pack being replaced.
  const [browsing, setBrowsing] = useState(false)
  const [creating, setCreating] = useState(false)
  const [pendingRemoval, setPendingRemoval] = useState<TestPackMemberRow | null>(null)
  const [pendingMove, setPendingMove] = useState<TestPackMemberRow | null>(null)
  const [pendingArchive, setPendingArchive] = useState(false)

  const [memberTable, setMemberTable] = useTableUrlState({ namespace: "mem" })
  const [availableTable, setAvailableTable] = useTableUrlState({ namespace: "iso" })

  const refresh = async (packId = selected) => {
    const client = getSupabaseBrowserClient()
    const [nextPacks, nextAvailable, nextIsoNumbers] = await Promise.all([
      listTestPackCatalog(client, projectId),
      listAvailableIsometricReadiness(client, projectId),
      listProjectIsometricNumbers(client, projectId),
    ])
    setPacks(nextPacks)
    setAvailable(nextAvailable)
    setIsoNumbers(nextIsoNumbers)
    if (packId) {
      const nextMembers = await listTestPackMembers(client, projectId, packId)
      setMembers(nextMembers)
      const nextPack = nextPacks.find((pack) => pack.id === packId)
      if (nextPack) {
        setForm({
          testPackNumber: nextPack.testPackNumber,
          location: nextPack.location ?? "",
          priority: nextPack.priority ?? "Normal",
          medium: nextPack.medium ?? "P",
          pressure: String(nextPack.pressure ?? ""),
          volumeM3: nextPack.volumeM3 === undefined ? "" : String(nextPack.volumeM3),
          plannedStartOn: nextPack.plannedStartOn ?? "",
          plannedEndOn: nextPack.plannedEndOn ?? "",
          systemId: nextPack.systemId ?? "",
          subsystemId: nextPack.subsystemId ?? "",
          serviceClassId: nextPack.serviceClassId ?? "",
          lineServiceId: nextPack.lineServiceId ?? "",
        })
      }
    }
  }

  const loadReferences = async () => {
    const client = getSupabaseBrowserClient()
    const [nextSystems, nextSubsystems, nextServiceClasses, nextLineServices] = await Promise.all([
      listProjectSystems(client, projectId),
      listProjectSubsystems(client, projectId),
      listProjectServiceClasses(client, projectId),
      listProjectLineServices(client, projectId),
    ])
    setSystems(nextSystems)
    setSubsystems(nextSubsystems)
    setServiceClasses(nextServiceClasses)
    setLineServices(nextLineServices)
  }

  useEffect(() => {
    let active = true
    setPacks([]); setAvailable([]); setIsoNumbers([]); setMembers([])
    setSystems([]); setSubsystems([]); setServiceClasses([]); setLineServices([])
    setSelected(null); setCreating(false); setError(null); setLoading(true)
    void Promise.all([refresh(null), loadReferences()])
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : "Could not load Builder")
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [projectId])

  useEffect(() => {
    if (!selected) {
      setMembers([])
      return
    }
    void refresh(selected).catch((cause) =>
      setError(cause instanceof Error ? cause.message : "Could not load Test Pack"),
    )
  }, [selected])

  const memberIds = useMemo(() => new Set(members.map((member) => member.isometric_id)), [members])
  const availableOptions = useMemo(
    () => isometricOptions(available, isoNumbers).filter((option) => !memberIds.has(option.id)),
    [available, isoNumbers, memberIds],
  )
  const isoLabelById = useMemo(
    () => new Map(isoNumbers.map((row) => [row.id, row.isoNumber])),
    [isoNumbers],
  )
  const systemOptions = useMemo(() => toReferenceOptions(systems), [systems])
  const subsystemOptions = useMemo(
    () => subsystemOptionsForSystem(subsystems, form.systemId),
    [subsystems, form.systemId],
  )
  const serviceClassOptions = useMemo(() => toReferenceOptions(serviceClasses), [serviceClasses])
  const lineServiceOptions = useMemo(() => toReferenceOptions(lineServices), [lineServices])
  const optionsFor = (field: (typeof REFERENCE_FIELDS)[number]["field"]): ReferenceOption[] =>
    field === "systemId"
      ? systemOptions
      : field === "subsystemId"
        ? subsystemOptions
        : field === "serviceClassId"
          ? serviceClassOptions
          : lineServiceOptions

  // A Subsystem belongs to one System, so switching System drops a selection the new one does not own.
  const updateField = (field: keyof FormState, value: string) =>
    setForm((current) =>
      field === "systemId"
        ? {
            ...current,
            systemId: value,
            subsystemId: keepSelectedOption(
              current.subsystemId,
              subsystemOptionsForSystem(subsystems, value),
            ),
          }
        : { ...current, [field]: value },
    )

  const selectedPack = packs.find((pack) => pack.id === selected) ?? null
  const isArchived = selectedPack?.lifecycle === "archived"
  const editable = canManage && !isArchived
  // Named before the submit rather than discovered from a joined server-error string after it.
  const missing = missingRequiredFields(form)

  // Re-entry matters here beyond the usual: `selected` is set as soon as the create resolves, so a
  // second click lands on the update branch and bumps the server revision for no reason.
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!editable || submitting) return
    setError(null); setNotice(null); setSubmitting(true)
    try {
      if (selected) {
        const result = await updateManagedTestPack(getSupabaseBrowserClient(), selected, toInput(form, []))
        if (!result.ok) {
          setError(Object.values(result.errors).join("; "))
          return
        }
        setNotice("Metadata saved; server revision incremented.")
      } else {
        const result = await createManagedTestPack(
          getSupabaseBrowserClient(),
          projectId,
          toInput(form, selectedAvailable),
          `browser-create-${Date.now()}`,
        )
        if (!result.ok) {
          setError(Object.values(result.errors).join("; "))
          return
        }
        const createdId = (result.value as { id?: string }).id
        if (createdId) {
          for (const isoId of selectedAvailable) {
            await composeManagedTestPack(getSupabaseBrowserClient(), createdId, isoId)
          }
        }
        setNotice("Test Pack created and selected ISOs composed atomically.")
        setSelected(createdId ?? null)
        setSelectedAvailable([])
        setCreating(false)
      }
      await refresh(selected)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Test Pack mutation failed")
    } finally {
      setSubmitting(false)
    }
  }

  const run = async (action: () => Promise<void>, success: string, failure: string) => {
    try {
      await action()
      await refresh(selected)
      setNotice(success)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : failure)
    }
  }

  const addMembers = () =>
    run(
      async () => {
        for (const isoId of selectedAvailable) {
          await composeManagedTestPack(getSupabaseBrowserClient(), selected!, isoId)
        }
        setSelectedAvailable([])
      },
      "ISO membership updated by server.",
      "Could not compose ISO",
    )

  const memberIsoNumber = (member: TestPackMemberRow) =>
    member.iso_number ?? isoLabelById.get(member.isometric_id ?? "") ?? member.isometric_id ?? "—"

  const MEMBER_COLUMNS: ReadonlyArray<DataColumn<TestPackMemberRow>> = [
    {
      id: "isoNumber",
      header: "ISO",
      value: memberIsoNumber,
      searchable: true,
      filter: "text",
      pinned: true,
      alwaysVisible: true,
      className: "font-mono text-xs",
    },
    { id: "sourceKind", header: "Source", value: (member) => member.source_kind, filter: "select" },
    { id: "assignedAt", header: "Assigned", value: (member) => member.assigned_at, filter: "date" },
    {
      id: "actions",
      header: "",
      sortable: false,
      alwaysVisible: true,
      numeric: true,
      value: () => "",
      cell: (member) => (
        <span className="flex justify-end gap-1">
          <Button size="sm" variant="outline" disabled={!editable} onClick={() => setPendingMove(member)}>
            Move
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={`Remove ${memberIsoNumber(member)} from this Test Pack`}
            disabled={!editable}
            onClick={() => setPendingRemoval(member)}
          >
            <Trash2 />
          </Button>
        </span>
      ),
    },
  ]

  const toggleAvailable = (isoId: string) =>
    setSelectedAvailable((current) =>
      current.includes(isoId) ? current.filter((id) => id !== isoId) : [...current, isoId],
    )

  const AVAILABLE_COLUMNS: ReadonlyArray<DataColumn<IsometricOption>> = [
    {
      id: "select",
      header: "Add",
      sortable: false,
      alwaysVisible: true,
      // Sorting on the flag lifts what is already ticked to the top, which is how a scattered
      // selection gets checked before it is committed.
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
      header: "ISO",
      value: (option) => option.label,
      searchable: true,
      filter: "text",
      pinned: true,
      alwaysVisible: true,
      className: "font-mono text-xs",
    },
    {
      id: "isRft",
      header: "Readiness",
      value: (option) => option.isRft,
      filter: "boolean",
      cell: (option) =>
        option.isRft ? (
          <StatusBadge status="ready" label="Ready for test" />
        ) : (
          <StatusBadge status="blocked" label="Blocked" />
        ),
    },
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Test Pack Builder</h1>
          <p className="text-muted-foreground text-sm">
            Whole-ISO composition. Readiness, lifecycle, and duplicate membership remain
            server-owned.
          </p>
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  const showEditor = Boolean(selected) && !browsing && !creating

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Test Pack Builder</h1>
        <p className="text-muted-foreground text-sm">
          Whole-ISO composition. Readiness, lifecycle, and duplicate membership remain server-owned.
        </p>
      </div>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      {notice ? <p className="text-success-fg text-sm">{notice}</p> : null}

      {creating ? (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
            <p className="text-sm font-medium">Creating a new Test Pack</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCreating(false)
                setForm(emptyForm)
                setSelectedAvailable([])
              }}
            >
              Cancel
            </Button>
          </CardContent>
        </Card>
      ) : (
        <RecordSelectTable
          title="Test Packs"
          columns={PACK_COLUMNS}
          rows={packs}
          rowId={(pack) => pack.id}
          selectedId={selected}
          onSelect={(pack) => setSelected(pack.id)}
          browsing={browsing}
          onBrowsingChange={setBrowsing}
          changeLabel="Change Test Pack"
          namespace="pack"
          searchPlaceholder="Search Test Pack number or location…"
          emptyTitle="No Test Packs in this project yet."
          emptyDescription="Create one, then compose accepted ISOs into it."
          selectedIdentity={(pack) => pack.testPackNumber}
          selectedMeta={(pack) =>
            `rev ${pack.revisionNo} · ${pack.activeIsoCount} ISO · ${mediumLabel(pack.medium)}${
              pack.location ? ` · ${pack.location}` : ""
            }`
          }
          toolbarActions={
            <Button
              disabled={!canManage}
              onClick={() => {
                setSelected(null)
                setForm(emptyForm)
                setMembers([])
                setSelectedAvailable([])
                setCreating(true)
              }}
            >
              <Plus /> New Test Pack
            </Button>
          }
        />
      )}

      {showEditor || creating ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{creating ? "New Test Pack" : "Definition and metadata"}</CardTitle>
              <CardDescription>
                {isArchived
                  ? "This Test Pack is archived and read-only."
                  : canManage
                    ? "Mutations use capability-checked RPCs and refresh projections after success."
                    : "View-only access: mutation controls are disabled."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
                {TEST_PACK_FIELDS.map(({ field, label, type, required, unit }) => (
                  <div key={field} className="space-y-1.5">
                    <Label htmlFor={`pack-${field}`}>
                      {label}
                      {unit ? <span className="text-muted-foreground"> ({unit})</span> : null}
                      {required ? <span className="text-destructive"> *</span> : null}
                    </Label>
                    <Input
                      id={`pack-${field}`}
                      required={required}
                      type={type}
                      value={form[field]}
                      onChange={(event) => updateField(field, event.target.value)}
                      disabled={!editable}
                    />
                  </div>
                ))}

                <FieldSelect
                  id="pack-priority"
                  label="Priority"
                  value={form.priority}
                  placeholder="Select a priority"
                  disabled={!editable}
                  options={TEST_PACK_PRIORITIES.map((item) => ({ id: item, label: item }))}
                  onChange={(value) => updateField("priority", value)}
                />
                <FieldSelect
                  id="pack-medium"
                  label="Test medium"
                  value={form.medium}
                  placeholder="Select a medium"
                  disabled={!editable}
                  options={TEST_PACK_MEDIA.map((item) => ({ id: item.value, label: item.label }))}
                  onChange={(value) => updateField("medium", value)}
                />

                {REFERENCE_FIELDS.map(({ field, label }) => {
                  const options = optionsFor(field)
                  return (
                    <FieldSelect
                      key={field}
                      id={`pack-${field}`}
                      label={label}
                      value={form[field]}
                      disabled={!editable}
                      options={options}
                      placeholder={
                        field === "subsystemId" && !form.systemId
                          ? "Select a System first"
                          : options.length === 0
                            ? `No active ${label.toLowerCase()} in this project`
                            : `Select ${label.toLowerCase()}`
                      }
                      onChange={(value) => updateField(field, value)}
                    />
                  )
                })}

                <div className="flex flex-wrap items-end gap-2 sm:col-span-2">
                  <Button type="submit" loading={submitting} disabled={!editable || missing.length > 0}>
                    {selected ? "Save metadata" : "Create and compose"}
                  </Button>
                  {selected ? (
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={!editable}
                      onClick={() => setPendingArchive(true)}
                    >
                      Archive
                    </Button>
                  ) : null}
                  {/* Naming what is still empty beats a disabled button with no explanation, and
                      beats submitting to find out from a joined server-error string. */}
                  {missing.length > 0 ? (
                    <p className="text-muted-foreground text-sm">
                      Still needed: {missing.join(", ")}
                    </p>
                  ) : null}
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="grid gap-6 xl:grid-cols-2">
            {selected ? (
              <Card>
                <CardHeader>
                  <CardTitle>ISO members</CardTitle>
                  <CardDescription>
                    Removal and move are refused by the server once workflow evidence exists.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DataTable
                    columns={MEMBER_COLUMNS}
                    rows={members}
                    state={memberTable}
                    onStateChange={setMemberTable}
                    rowId={(member) => String(member.id)}
                    searchPlaceholder="Search ISO…"
                    emptyTitle="No ISO composed into this Test Pack yet."
                    emptyDescription="Pick accepted ISOs on the right and add them."
                    containerClassName="max-h-[40vh]"
                  />
                </CardContent>
              </Card>
            ) : null}

            <Card>
              <CardHeader>
                <CardTitle>Available accepted ISOs</CardTitle>
                <CardDescription>
                  Every accepted ISO in scope that is not already composed into this Test Pack.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={AVAILABLE_COLUMNS}
                  rows={availableOptions}
                  state={availableTable}
                  onStateChange={setAvailableTable}
                  rowId={(option) => option.id}
                  searchPlaceholder="Search ISO…"
                  emptyTitle="No available accepted ISOs in this project scope."
                  containerClassName="max-h-[40vh]"
                  toolbarActions={
                    selected ? (
                      <Button
                        disabled={!editable || selectedAvailable.length === 0}
                        onClick={() => void addMembers()}
                      >
                        <Plus /> Add {selectedAvailable.length || ""} selected
                      </Button>
                    ) : (
                      <span className="text-muted-foreground text-sm">
                        {selectedAvailable.length} will be composed on create
                      </span>
                    )
                  }
                />
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}

      <ConfirmAction
        open={pendingRemoval !== null}
        onOpenChange={(open) => !open && setPendingRemoval(null)}
        title={`Remove ${pendingRemoval ? memberIsoNumber(pendingRemoval) : "ISO"}?`}
        description="The membership is removed from this Test Pack. Its history is retained by the server."
        confirmLabel="Remove ISO"
        destructive
        onConfirm={() => {
          const member = pendingRemoval
          setPendingRemoval(null)
          if (!member) return
          void run(
            () =>
              removeManagedTestPackIsometric(
                getSupabaseBrowserClient(),
                selected!,
                member.isometric_id ?? "",
              ).then(() => undefined),
            "ISO removed; history retained.",
            "Could not remove ISO",
          )
        }}
      />

      <ConfirmAction
        open={pendingArchive}
        onOpenChange={setPendingArchive}
        title="Archive this Test Pack?"
        description="Archiving makes the Test Pack read-only. Its composition and history are kept."
        confirmLabel="Archive"
        destructive
        onConfirm={() => {
          setPendingArchive(false)
          void run(
            () => archiveManagedTestPack(getSupabaseBrowserClient(), selected!).then(() => undefined),
            "Test Pack archived.",
            "Could not archive Test Pack",
          )
        }}
      />

      <MoveIsoDialog
        isoNumber={pendingMove ? memberIsoNumber(pendingMove) : ""}
        open={pendingMove !== null}
        onOpenChange={(open) => !open && setPendingMove(null)}
        destinations={packs
          .filter((pack) => pack.id !== selected && pack.lifecycle !== "archived")
          .map((pack) => ({ id: pack.id, label: pack.testPackNumber }))}
        onMove={(destination) => {
          const member = pendingMove
          setPendingMove(null)
          if (!member) return
          void run(
            () =>
              moveManagedTestPackIsometric(
                getSupabaseBrowserClient(),
                selected!,
                member.isometric_id ?? "",
                destination,
              ).then(() => undefined),
            "ISO moved by the server; source and destination revisions refreshed.",
            "Could not move ISO",
          )
        }}
      />
    </div>
  )
}

export { TEXT_FIELDS, REFERENCE_FIELDS }
