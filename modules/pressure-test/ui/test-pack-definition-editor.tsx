"use client"

import { useTestPackTranslations, testPackValidationMessages, reportTestPackError, testPackPriorityLabel } from "@/modules/pressure-test/ui/test-pack-i18n"

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useMarkInputsRecorded, useRegisterUnsavedState } from "@/components/pipeqc/unsaved-input-guard"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import { archiveManagedTestPack, updateManagedTestPack } from "../application/manage-test-pack"
import {
  listProjectLineServices,
  listProjectServiceClasses,
  listProjectSubsystems,
  listProjectSystems,
  type ProjectReferenceOptionRow,
  type ProjectSubsystemOptionRow,
  type TestPackCatalogRow,
} from "../infrastructure/supabase-pressure-test-repository"
import {
  TEST_PACK_MEDIA,
  TEST_PACK_PRIORITIES,
  missingRequiredFields,
  testPackFields,
} from "./test-pack-builder-model"
import { ConfirmAction, FieldSelect } from "./test-pack-builder-parts"
import {
  keepSelectedOption,
  subsystemOptionsForSystem,
  toReferenceOptions,
} from "./test-pack-reference-model"
import { useOptionalTestPackWorkspaceContext } from "./test-pack-workspace-context"

export interface TestPackDefinitionEditorProps {
  projectId: string
  pack: TestPackCatalogRow
  canManage: boolean
  dataCurrent: boolean
  onUpdated?: () => void
  onArchived?: () => void
}

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

function packToForm(pack: TestPackCatalogRow): FormState {
  return {
    testPackNumber: pack.testPackNumber ?? "",
    location: pack.location ?? "",
    priority: pack.priority ?? TEST_PACK_PRIORITIES[1],
    medium: pack.medium ?? "P",
    pressure: pack.pressure !== undefined ? String(pack.pressure) : "",
    volumeM3: pack.volumeM3 !== undefined ? String(pack.volumeM3) : "",
    plannedStartOn: pack.plannedStartOn ?? "",
    plannedEndOn: pack.plannedEndOn ?? "",
    systemId: pack.systemId ?? "",
    subsystemId: pack.subsystemId ?? "",
    serviceClassId: pack.serviceClassId ?? "",
    lineServiceId: pack.lineServiceId ?? "",
  }
}

export function TestPackDefinitionEditor({
  projectId,
  pack,
  canManage,
  dataCurrent,
  onUpdated,
  onArchived,
}: TestPackDefinitionEditorProps) {
  const t = useTestPackTranslations()

  const [form, setForm] = useState<FormState>(() => packToForm(pack))
  const [systems, setSystems] = useState<ProjectReferenceOptionRow[]>([])
  const [subsystems, setSubsystems] = useState<ProjectSubsystemOptionRow[]>([])
  const [serviceClasses, setServiceClasses] = useState<ProjectReferenceOptionRow[]>([])
  const [lineServices, setLineServices] = useState<ProjectReferenceOptionRow[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [pendingArchive, setPendingArchive] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const formRef = useRef<HTMLFormElement>(null)
  const markRecorded = useMarkInputsRecorded()
  const workspace = useOptionalTestPackWorkspaceContext()

  // Reset form when pack changes
  useEffect(() => {
    setForm(packToForm(pack))
    setError(null)
  }, [pack])

  // Load project references
  useEffect(() => {
    let active = true
    const client = getSupabaseBrowserClient()
    void Promise.all([
      listProjectSystems(client, projectId),
      listProjectSubsystems(client, projectId),
      listProjectServiceClasses(client, projectId),
      listProjectLineServices(client, projectId),
    ]).then(([nextSystems, nextSubsystems, nextClasses, nextLines]) => {
      if (!active) return
      setSystems(nextSystems)
      setSubsystems(nextSubsystems)
      setServiceClasses(nextClasses)
      setLineServices(nextLines)
    })
    return () => {
      active = false
    }
  }, [projectId])

  const initialForm = useMemo(() => packToForm(pack), [pack])
  const isDirty = useMemo(() => {
    return Object.keys(form).some(
      (key) => form[key as keyof FormState] !== initialForm[key as keyof FormState],
    )
  }, [form, initialForm])

  useRegisterUnsavedState(isDirty)

  const editable = canManage && pack.lifecycle !== "archived" && dataCurrent
  const pressureUnitDisplay = pack.pressureUnit ?? t("text.pressureUnitIsNotConfigured")
  const dynamicFields = useMemo(() => testPackFields(pack.pressureUnit ?? null), [pack.pressureUnit])

  const availableSubsystems = useMemo(
    () => subsystemOptionsForSystem(subsystems, form.systemId),
    [subsystems, form.systemId],
  )

  const systemOptions = useMemo(() => toReferenceOptions(systems), [systems])
  const serviceClassOptions = useMemo(() => toReferenceOptions(serviceClasses), [serviceClasses])
  const lineServiceOptions = useMemo(() => toReferenceOptions(lineServices), [lineServices])

  const updateField = (field: keyof FormState, value: string) => {
    setForm((current) => {
      const next = { ...current, [field]: value }
      if (field === "systemId") {
        next.subsystemId = keepSelectedOption(
          current.subsystemId,
          subsystemOptionsForSystem(subsystems, value),
        )
      }
      return next
    })
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!editable || submitting) return

    const missing = missingRequiredFields(form)
    if (missing.length > 0) {
      setError(t("text.pleaseFillInRequiredFields0", { v1: (missing.map((label) => t(label)).join(", ")) ?? "—" }))
      return
    }

    setSubmitting(true)
    setError(null)

    const doSubmit = async () => {
      const client = getSupabaseBrowserClient()
      const result = await updateManagedTestPack(client, pack.id, {
        testPackNumber: form.testPackNumber,
        location: form.location,
        priority: form.priority,
        medium: form.medium,
        pressure: form.pressure ? Number(form.pressure) : 0,
        volumeM3: form.volumeM3 ? Number(form.volumeM3) : undefined,
        plannedStartOn: form.plannedStartOn,
        plannedEndOn: form.plannedEndOn,
        systemId: form.systemId,
        subsystemId: form.subsystemId,
        serviceClassId: form.serviceClassId,
        lineServiceId: form.lineServiceId,
      })

      if (!result.ok) {
        setError(testPackValidationMessages(result.errors, t))
        return
      }

      if (formRef.current) {
        const fields = Array.from(
          formRef.current.querySelectorAll<HTMLElement>("input, select, textarea"),
        )
        markRecorded(fields)
      }

      toast.success(t("text.testPackMetadataUpdated"))
      if (workspace) {
        await workspace.refresh()
      }
      onUpdated?.()
    }

    try {
      if (workspace) {
        await workspace.runCommand(doSubmit)
      } else {
        await doSubmit()
      }
    } catch (cause) {
      setError(reportTestPackError(cause, t("text.failedToUpdateTestPack")))
    } finally {
      setSubmitting(false)
    }
  }

  const onConfirmArchive = async () => {
    if (!editable || submitting) return
    setSubmitting(true)
    setError(null)

    const doArchive = async () => {
      const client = getSupabaseBrowserClient()
      await archiveManagedTestPack(client, pack.id)
      toast.success(t("text.testPack0Archived", { v1: (pack.testPackNumber) ?? "—" }))
      if (workspace) {
        await workspace.refresh()
      }
      onArchived?.()
    }

    try {
      if (workspace) {
        await workspace.runCommand(doArchive)
      } else {
        await doArchive()
      }
    } catch (cause) {
      setError(reportTestPackError(cause, t("text.failedToArchiveTestPack")))
    } finally {
      setSubmitting(false)
      setPendingArchive(false)
    }
  }

  return (
    <Card data-explicit-unsaved-commit="true">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>{t("text.definition")}</CardTitle>
          <p className="text-sm text-muted-foreground">

            {t("text.metadataAndReferentialAttributesFor")} {pack.testPackNumber} {t("text.revisionInline", { revision: pack.revisionNo })}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={pack.lifecycle === "archived" ? "outline" : "default"}>
            {t(`codes.status.${pack.lifecycle}`)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
        {!dataCurrent && (
          <p className="mb-4 rounded border border-amber-200 bg-amber-50 p-2 text-sm text-amber-900">

            {t("text.dataIsStaleRetryRefreshBeforeRecordingModifications")}
          </p>
        )}
        {!pack.pressureUnit && (
          <p className="mb-4 text-xs text-amber-700">

            {t("text.pressureUnitIsNotConfiguredForThisProject")}
          </p>
        )}

        <form ref={formRef} onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {dynamicFields.map(({ field, label, type, required, unit }) => (
              <div key={field} className="space-y-1.5">
                <Label htmlFor={`def-${field}`}>
                  {t(label)}
                  {unit ? <span className="text-muted-foreground"> ({unit})</span> : null}
                  {required ? <span className="text-destructive"> *</span> : null}
                </Label>
                <Input
                  id={`def-${field}`}
                  type={type}
                  value={form[field]}
                  disabled={!editable}
                  onChange={(e) => updateField(field, e.target.value)}
                  placeholder={field === "pressure" ? pressureUnitDisplay : undefined}
                />
              </div>
            ))}

            <div className="space-y-1.5">
              <Label htmlFor="pack-priority">{t("text.priority211")}</Label>
              <select
                id="pack-priority"
                value={form.priority}
                disabled={!editable}
                onChange={(e) => updateField("priority", e.target.value)}
                className="h-9 w-full rounded border bg-transparent px-3 text-sm"
              >
                {TEST_PACK_PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    {testPackPriorityLabel(priority, t)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="def-medium">{t("text.medium212")}</Label>
              <select
                id="def-medium"
                value={form.medium}
                disabled={!editable}
                onChange={(e) => updateField("medium", e.target.value)}
                className="h-9 w-full rounded border bg-transparent px-3 text-sm"
              >
                {TEST_PACK_MEDIA.map((m) => (
                  <option key={m.value} value={m.value}>
                    {t(m.label)}
                  </option>
                ))}
              </select>
            </div>

            <FieldSelect
              id="def-system"
              label={t("text.system213")}
              value={form.systemId}
              placeholder={t("text.selectSystem")}
              options={systemOptions}
              disabled={!editable}
              onChange={(value) => updateField("systemId", value)}
            />

            <FieldSelect
              id="def-subsystem"
              label={t("text.subsystem215")}
              value={form.subsystemId}
              placeholder={t("text.selectSubsystem")}
              options={availableSubsystems}
              disabled={!editable || !form.systemId}
              onChange={(value) => updateField("subsystemId", value)}
            />

            <FieldSelect
              id="def-service-class"
              label={t("text.serviceClass217")}
              value={form.serviceClassId}
              placeholder={t("text.selectServiceClass")}
              options={serviceClassOptions}
              disabled={!editable}
              onChange={(value) => updateField("serviceClassId", value)}
            />

            <FieldSelect
              id="def-line-service"
              label={t("text.lineService219")}
              value={form.lineServiceId}
              placeholder={t("text.selectLineService")}
              options={lineServiceOptions}
              disabled={!editable}
              onChange={(value) => updateField("lineServiceId", value)}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t">
            <div className="flex items-center gap-2">
              <Button
                type="submit"
                disabled={!editable || submitting || !isDirty}
                loading={submitting}
              >

                {t("text.saveMetadata")}
              </Button>
              {isDirty && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={submitting}
                  onClick={() => setForm(packToForm(pack))}
                >

                  {t("text.discardChanges")}
                </Button>
              )}
            </div>

            {canManage && pack.lifecycle !== "archived" && (
              <Button
                type="button"
                variant="destructive"
                disabled={!editable || submitting}
                onClick={() => setPendingArchive(true)}
              >

                {t("text.archiveTestPack")}
              </Button>
            )}
          </div>
        </form>

        <ConfirmAction
          open={pendingArchive}
          onOpenChange={setPendingArchive}
          title={t("text.archive0", { v1: (pack.testPackNumber) ?? "—" })}
          description={t("text.archivingMarksThePackReadOnlyAndLocks")}
          confirmLabel={t("text.archive")}
          destructive
          onConfirm={() => void onConfirmArchive()}
        />
      </CardContent>
    </Card>
  )
}
