"use client"

import { useTestPackTranslations, testPackValidationMessages, reportTestPackError, testPackPriorityLabel } from "@/modules/pressure-test/ui/test-pack-i18n"

import { useEffect, useMemo, useState, type FormEvent } from "react"
import { Plus } from "lucide-react"

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
import { useRequestLeave } from "@/components/pipeqc/unsaved-input-guard"
import { useNameWorkContext, useWorkContextParam } from "@/components/pipeqc/work-context"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import {
  composeManagedTestPack,
  createManagedTestPack,
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
import { FieldSelect } from "./test-pack-builder-parts"
import { TestPackCompositionEditor } from "./test-pack-composition-editor"
import { TestPackDefinitionEditor } from "./test-pack-definition-editor"

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
  priority: TEST_PACK_PRIORITIES[1],
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

export interface TestPackBuilderScreenProps {
  projectId: string
  canManage: boolean
  testPackId?: string
  initialView?: "definition" | "composition"
  isNew?: boolean
}

export function TestPackBuilderScreen({
  projectId,
  canManage,
  testPackId,
  initialView = "definition",
  isNew = false,
}: TestPackBuilderScreenProps) {
  const t = useTestPackTranslations()
  const PACK_COLUMNS: ReadonlyArray<DataColumn<TestPackCatalogRow>> = [
  {
    id: "testPackNumber",
    header: t("text.testPack"),
    value: (pack) => pack.testPackNumber,
    searchable: true,
    filter: "text",
    pinned: true,
    alwaysVisible: true,
    className: "font-mono text-xs",
  },
  {
    id: "lifecycle",
    header: t("text.lifecycle"),
    value: (pack) => t(`codes.status.${pack.lifecycle}`),
    filter: "select",
    cell: (pack) => <StatusBadge status={pack.lifecycle} />,
  },
  { id: "activeIsoCount", header: "ISO", numeric: true, value: (pack) => pack.activeIsoCount, filter: "number" },
  { id: "revisionNo", header: t("text.rev123"), numeric: true, value: (pack) => pack.revisionNo },
  { id: "location", header: t("text.location"), value: (pack) => pack.location, searchable: true, filter: "select" },
  { id: "priority", header: t("text.priority"), value: (pack) => testPackPriorityLabel(pack.priority, t), filter: "select" },
  {
    id: "medium",
    header: t("text.medium"),
    value: (pack) => t(mediumLabel(pack.medium)),
    filter: "select",
  },
  { id: "plannedStartOn", header: t("text.plannedStart"), value: (pack) => pack.plannedStartOn, filter: "date" },
]

  const [packs, setPacks] = useState<TestPackCatalogRow[]>([])
  const [selected, setSelected] = useState<string | null>(testPackId ?? null)
  const [activeTab, setActiveTab] = useState<"definition" | "composition">(initialView)
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
  const [browsing, setBrowsing] = useState(false)
  const [creating, setCreating] = useState(isNew && !testPackId)

  const [availableTable, setAvailableTable] = useTableUrlState({ namespace: "iso" })
  const [, setTestPackParam] = useWorkContextParam("testPack")
  const requestLeave = useRequestLeave()

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
    setPacks([])
    setAvailable([])
    setIsoNumbers([])
    setMembers([])
    setSystems([])
    setSubsystems([])
    setServiceClasses([])
    setLineServices([])
    setError(null)
    setLoading(true)
    void Promise.all([refresh(null), loadReferences()])
      .catch((cause) => {
        if (active) setError(reportTestPackError(cause, t("text.couldNotLoadBuilder")))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [projectId])

  useEffect(() => {
    if (testPackId !== undefined && testPackId !== selected) {
      setSelected(testPackId)
      setCreating(false)
    }
  }, [testPackId])

  useEffect(() => {
    if (isNew) {
      setSelected(null)
      setCreating(true)
    }
  }, [isNew])

  useEffect(() => {
    if (initialView) {
      setActiveTab(initialView)
    }
  }, [initialView])

  useEffect(() => {
    if (!selected) {
      setMembers([])
      return
    }
    void refresh(selected).catch((cause) =>
      setError(reportTestPackError(cause, t("text.couldNotLoadTestPack"))),
    )
  }, [selected])

  const selectedPack = packs.find((pack) => pack.id === selected) ?? null

  useNameWorkContext("testPack", selected, selectedPack?.testPackNumber ?? null)

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

  const missing = missingRequiredFields(form)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!canManage || submitting) return
    setError(null)
    setNotice(null)
    setSubmitting(true)
    try {
      if (selected) {
        const result = await updateManagedTestPack(getSupabaseBrowserClient(), selected, toInput(form, []))
        if (!result.ok) {
          setError(testPackValidationMessages(result.errors, t))
          return
        }
        setNotice(t("text.metadataSavedServerRevisionIncremented"))
      } else {
        const result = await createManagedTestPack(
          getSupabaseBrowserClient(),
          projectId,
          toInput(form, selectedAvailable),
          `browser-create-${Date.now()}`,
        )
        if (!result.ok) {
          setError(testPackValidationMessages(result.errors, t))
          return
        }
        const createdId = (result.value as { id?: string }).id
        if (createdId) {
          const failedIsoIds: string[] = []
          let successCount = 0
          for (const isoId of selectedAvailable) {
            try {
              await composeManagedTestPack(getSupabaseBrowserClient(), createdId, isoId)
              successCount++
            } catch {
              failedIsoIds.push(isoId)
            }
          }
          if (failedIsoIds.length === 0) {
            setNotice(t("text.testPackCreatedWith0IsoSComposed", { v1: (successCount) ?? "—" }))
          } else {
            const failedLabels = failedIsoIds.map((id) => isoLabelById.get(id) ?? id).join(", ")
            setNotice(
              t("text.testPackCreatedWith0Of0Isos", { v1: (successCount) ?? "—", v2: (selectedAvailable.length) ?? "—", v3: (failedLabels) ?? "—" }),
            )
          }
          setSelected(createdId)
          setSelectedAvailable([])
          setCreating(false)
          setTestPackParam(createdId, { extra: { view: "composition", new: null } })
        }
      }
      await refresh(selected)
    } catch (cause) {
      setError(reportTestPackError(cause, t("text.testPackMutationFailed")))
    } finally {
      setSubmitting(false)
    }
  }

  const toggleAvailable = (isoId: string) =>
    setSelectedAvailable((current) =>
      current.includes(isoId) ? current.filter((id) => id !== isoId) : [...current, isoId],
    )

  const AVAILABLE_COLUMNS: ReadonlyArray<DataColumn<IsometricOption>> = [
    {
      id: "select",
      header: t("text.add"),
      sortable: false,
      alwaysVisible: true,
      value: (option) => selectedAvailable.includes(option.id),
      filter: "boolean",
      headerClassName: "w-14",
      cell: (option) => (
        <Checkbox
          aria-label={t("text.add0", { v1: (option.label) ?? "—" })}
          checked={selectedAvailable.includes(option.id)}
          disabled={!canManage}
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
      header: t("text.readiness"),
      value: (option) => option.isRft,
      filter: "boolean",
      cell: (option) =>
        option.isRft ? (
          <StatusBadge status="ready" label={t("text.readyForTest")} />
        ) : (
          <StatusBadge status="blocked" label={t("text.blocked")} />
        ),
    },
  ]

  const handleSelectPack = (pack: TestPackCatalogRow) => {
    requestLeave(() => {
      setSelected(pack.id)
      setCreating(false)
      setTestPackParam(pack.id, { extra: { view: activeTab, new: null } })
    })
  }

  const handleNewPack = () => {
    requestLeave(() => {
      setSelected(null)
      setForm(emptyForm)
      setMembers([])
      setSelectedAvailable([])
      setCreating(true)
      setTestPackParam(null, { extra: { new: "1", view: null } })
    })
  }

  const handleCancelNew = () => {
    requestLeave(() => {
      setCreating(false)
      setForm(emptyForm)
      setSelectedAvailable([])
      setTestPackParam(null, { extra: { new: null } })
    })
  }

  const handleTabChange = (tab: "definition" | "composition") => {
    requestLeave(() => {
      setActiveTab(tab)
      if (selected) {
        setTestPackParam(selected, { extra: { view: tab, new: null } })
      }
    })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">{t("text.testPackBuilder")}</h1>
          <p className="text-muted-foreground text-sm">

            {t("text.wholeIsoCompositionReadinessLifecycleAndDuplicateMembership")}
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
        <h1 className="text-2xl font-semibold">{t("text.testPackBuilder")}</h1>
        <p className="text-muted-foreground text-sm">

          {t("text.wholeIsoCompositionReadinessLifecycleAndDuplicateMembership")}
        </p>
      </div>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      {notice ? <p className="text-success-fg text-sm">{notice}</p> : null}

      {creating ? (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
            <p className="text-sm font-medium">{t("text.creatingANewTestPack")}</p>
            <Button variant="outline" size="sm" onClick={handleCancelNew}>

              {t("text.cancel")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <RecordSelectTable
          title={t("text.testPacks")}
          columns={PACK_COLUMNS}
          rows={packs}
          rowId={(pack) => pack.id}
          selectedId={selected}
          onSelect={handleSelectPack}
          browsing={browsing}
          onBrowsingChange={setBrowsing}
          changeLabel={t("text.changePack")}
          namespace="pack"
          searchPlaceholder={t("text.searchPack")}
          emptyTitle={t("text.noPacksBuilder")}
          emptyDescription={t("text.createAndComposeHelp")}
          selectedIdentity={(pack) => pack.testPackNumber}
          selectedMeta={(pack) =>
            t("text.rev00Iso00", { v1: (pack.revisionNo) ?? "—", v2: (pack.activeIsoCount) ?? "—", v3: (t(mediumLabel(pack.medium))) ?? "—", v4: pack.location ? ` · ${pack.location}` : "" })
          }
          toolbarActions={
            <Button disabled={!canManage} onClick={handleNewPack}>
              <Plus />  {t("text.newTestPack")}
            </Button>
          }
        />
      )}

      {showEditor ? (
        <div className="space-y-4">
          <div className="flex gap-2 border-b pb-2">
            <Button
              type="button"
              variant={activeTab === "definition" ? "default" : "outline"}
              size="sm"
              onClick={() => handleTabChange("definition")}
            >

              {t("text.definition")}
            </Button>
            <Button
              type="button"
              variant={activeTab === "composition" ? "default" : "outline"}
              size="sm"
              onClick={() => handleTabChange("composition")}
            >

              {t("text.composition")}
            </Button>
          </div>

          {selectedPack ? (
            <>
              {activeTab === "definition" && (
                <TestPackDefinitionEditor
                  projectId={projectId}
                  pack={selectedPack}
                  canManage={canManage}
                  dataCurrent={true}
                  onUpdated={() => void refresh(selected)}
                  onArchived={() => void refresh(selected)}
                />
              )}

              {activeTab === "composition" && (
                <TestPackCompositionEditor
                  projectId={projectId}
                  pack={selectedPack}
                  canManage={canManage}
                  dataCurrent={true}
                  onComposed={() => void refresh(selected)}
                />
              )}
            </>
          ) : (
            <Card>
              <CardContent className="p-6 text-center text-sm text-muted-foreground">

                {t("text.testPackUnavailableOrNotFoundInThis")}
              </CardContent>
            </Card>
          )}
        </div>
      ) : null}

      {creating ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{t("text.newTestPack")}</CardTitle>
              <CardDescription>
                {canManage
                  ? t("text.mutationsUseCapabilityCheckedRpcsAndRefreshProjections")
                  : t("text.viewOnlyAccessMutationControlsAreDisabled")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
                {TEST_PACK_FIELDS.map(({ field, label, type, required, unit }) => (
                  <div key={field} className="space-y-1.5">
                    <Label htmlFor={`pack-${field}`}>
                      {t(label)}
                      {unit ? <span className="text-muted-foreground"> ({unit})</span> : null}
                      {required ? <span className="text-destructive"> *</span> : null}
                    </Label>
                    <Input
                      id={`pack-${field}`}
                      required={required}
                      type={type}
                      value={form[field]}
                      onChange={(event) => updateField(field, event.target.value)}
                      disabled={!canManage}
                    />
                  </div>
                ))}

                <FieldSelect
                  id="pack-priority"
                  label={t("text.priority")}
                  value={form.priority}
                  placeholder={t("text.selectAPriority")}
                  disabled={!canManage}
                  options={TEST_PACK_PRIORITIES.map((item) => ({ id: item, label: t(`text.${item.toLowerCase()}`) }))}
                  onChange={(value) => updateField("priority", value)}
                />
                <FieldSelect
                  id="pack-medium"
                  label={t("text.testMedium")}
                  value={form.medium}
                  placeholder={t("text.selectAMedium")}
                  disabled={!canManage}
                  options={TEST_PACK_MEDIA.map((item) => ({ id: item.value, label: t(item.label) }))}
                  onChange={(value) => updateField("medium", value)}
                />

                {REFERENCE_FIELDS.map(({ field, label }) => {
                  const options = optionsFor(field)
                  return (
                    <FieldSelect
                      key={field}
                      id={`pack-${field}`}
                      label={t(label)}
                      value={form[field]}
                      disabled={!canManage}
                      options={options}
                      placeholder={
                        field === "subsystemId" && !form.systemId
                          ? t("text.selectASystemFirst")
                          : options.length === 0
                            ? t("text.noActive0InThisProject", { v1: (t(label).toLowerCase()) ?? "—" })
                            : t("text.select0", { v1: (t(label).toLowerCase()) ?? "—" })
                      }
                      onChange={(value) => updateField(field, value)}
                    />
                  )
                })}

                <div className="flex flex-wrap items-end gap-2 sm:col-span-2">
                  <Button type="submit" loading={submitting} disabled={!canManage || missing.length > 0}>

                    {t("text.createAndCompose")}
                  </Button>
                  {missing.length > 0 ? (
                    <p className="text-muted-foreground text-sm">

                      {t("text.stillNeeded")} {missing.map((label) => t(label)).join(", ")}
                    </p>
                  ) : null}
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("text.availableAcceptedIsos")}</CardTitle>
              <CardDescription>

                {t("text.everyAcceptedIsoInScopeThatIsNot")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={AVAILABLE_COLUMNS}
                rows={availableOptions}
                state={availableTable}
                onStateChange={setAvailableTable}
                rowId={(option) => option.id}
                searchPlaceholder={t("text.searchIso")}
                emptyTitle={t("text.noAcceptedIsos")}
                containerClassName="max-h-[40vh]"
                toolbarActions={
                  <span className="text-muted-foreground text-sm">
                    {selectedAvailable.length}  {t("text.willBeComposedOnCreate")}
                  </span>
                }
              />
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  )
}

export { TEXT_FIELDS, REFERENCE_FIELDS }
