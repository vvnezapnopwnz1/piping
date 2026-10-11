"use client"

import { useTranslations } from "next-intl"
import { formatFieldErrors } from "./setup-field-issue"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { AlertCircle, Plus, RefreshCw } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { DataColumn } from "@/components/ui/data-table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import {
  loadExtendedReferences,
  createDevice,
  listDeviceUserCandidates,
  assignDeviceUser,
  saveAssemblySettings,
  type LoadedExtendedReferences,
} from "../infrastructure/supabase-extended-reference-repository"
import {
  validateDeviceInput,
  validateAssemblySettingsInput,
  validateDeviceUserInput,
  type DeviceUserCandidate,
  type SpoolingMaterialType,
  type SpoolingMaterialClass,
  type SpoolingChecklistItem,
  type RalCode,
  type PaintMatrixRule,
  type Device,
} from "../domain/extended-reference"
import type { ReferenceStatus } from "../domain/reference"
import { ReferenceStatusBadge } from "./reference-status-badge"
import type { ReferenceKeyOf } from "./reference-catalog"
import { ReferencePane, ReferenceTable } from "./reference-pane"
import { AddAnotherToggle } from "./add-another-toggle"

type ExtendedT = ReturnType<typeof useTranslations<"projectSetup.extendedReference">>

interface AssignedDeviceUser {
  id: string
  user: string
  deviceCode: string | null
  status: ReferenceStatus
}

function spoolingMaterialTypeColumns(t: ExtendedT): ReadonlyArray<DataColumn<SpoolingMaterialType>> {
  return [
    { id: "code", header: t("columns.code"), value: (row) => row.code, searchable: true, alwaysVisible: true, className: "font-mono font-medium" },
    { id: "description", header: t("columns.description"), value: (row) => row.description, searchable: true },
    { id: "status", header: t("columns.status"), value: (row) => row.status, cell: (row) => <ReferenceStatusBadge status={row.status} /> },
  ]
}

function spoolingMaterialClassColumns(t: ExtendedT): ReadonlyArray<DataColumn<SpoolingMaterialClass>> {
  return [
    { id: "externalClassCode", header: t("columns.classCode"), value: (row) => row.externalClassCode, searchable: true, alwaysVisible: true, className: "font-mono font-medium" },
    {
      id: "materialType",
      header: t("columns.materialType"),
      value: (row) => row.materialTypeCode ?? "",
      searchable: true,
      cell: (row) => (row.materialTypeCode ? <Badge variant="secondary">{row.materialTypeCode}</Badge> : "—"),
    },
    { id: "status", header: t("columns.status"), value: (row) => row.status, cell: (row) => <ReferenceStatusBadge status={row.status} /> },
  ]
}

function spoolingChecklistColumns(t: ExtendedT): ReadonlyArray<DataColumn<SpoolingChecklistItem>> {
  return [
    { id: "code", header: t("columns.code"), value: (row) => row.code, searchable: true, alwaysVisible: true, className: "font-mono font-medium" },
    { id: "description", header: t("columns.description"), value: (row) => row.description, searchable: true },
    {
      id: "isRequired",
      header: t("columns.required"),
      value: (row) => (row.isRequired ? t("required") : t("optional")),
      cell: (row) =>
        row.isRequired ? (
          <Badge variant="outline">{t("required")}</Badge>
        ) : (
          <span className="text-muted-foreground text-xs">{t("optional")}</span>
        ),
    },
    { id: "sortOrder", header: t("columns.order"), value: (row) => row.sortOrder, numeric: true },
    { id: "status", header: t("columns.status"), value: (row) => row.status, cell: (row) => <ReferenceStatusBadge status={row.status} /> },
  ]
}

function ralCodeColumns(t: ExtendedT): ReadonlyArray<DataColumn<RalCode>> {
  return [
    { id: "ralCode", header: t("columns.ralCode"), value: (row) => row.ralCode, searchable: true, alwaysVisible: true, className: "font-mono font-medium" },
    { id: "colorCode", header: t("columns.colorCode"), value: (row) => row.colorCode, searchable: true },
    {
      id: "lineService",
      header: t("columns.lineService"),
      value: (row) => row.lineServiceCode ?? "",
      searchable: true,
      cell: (row) => (row.lineServiceCode ? <Badge variant="secondary">{row.lineServiceCode}</Badge> : "—"),
    },
    { id: "status", header: t("columns.status"), value: (row) => row.status, cell: (row) => <ReferenceStatusBadge status={row.status} /> },
  ]
}

function paintMatrixColumns(t: ExtendedT): ReadonlyArray<DataColumn<PaintMatrixRule>> {
  return [
    {
      id: "lineService",
      header: t("columns.lineService"),
      value: (row) => row.lineServiceCode ?? "",
      searchable: true,
      alwaysVisible: true,
      cell: (row) => (row.lineServiceCode ? <Badge variant="secondary">{row.lineServiceCode}</Badge> : "—"),
    },
    {
      id: "ralCode",
      header: t("columns.ralCode"),
      value: (row) => row.ralCode ?? "",
      searchable: true,
      cell: (row) => (row.ralCode ? <Badge variant="outline">{row.ralCode}</Badge> : "—"),
    },
    {
      id: "blasting",
      header: t("columns.blasting"),
      value: (row) => (row.blastingRequired ? t("blast") : t("noBlast")),
      cell: (row) => (row.blastingRequired ? t("blast") : t("noBlast")),
    },
    {
      id: "primer",
      header: t("columns.primer"),
      value: (row) => (row.primerRequired ? t("primer") : t("noPrimer")),
      cell: (row) => (row.primerRequired ? t("primer") : t("noPrimer")),
    },
    {
      id: "intCoats",
      header: t("columns.intCoats"),
      value: (row) => row.intermediateCoatCount,
      numeric: true,
    },
    {
      id: "finalCoats",
      header: t("columns.finalCoats"),
      value: (row) => row.finalCoatCount,
      numeric: true,
    },
    {
      id: "dft",
      header: t("columns.dft"),
      value: (row) => row.requiredFinalDftMicrons,
      numeric: true,
    },
    { id: "status", header: t("columns.status"), value: (row) => row.status, cell: (row) => <ReferenceStatusBadge status={row.status} /> },
  ]
}

function deviceColumns(t: ExtendedT): ReadonlyArray<DataColumn<Device>> {
  return [
    { id: "code", header: t("columns.code"), value: (row) => row.code, searchable: true, alwaysVisible: true, className: "font-mono font-medium" },
    { id: "description", header: t("columns.description"), value: (row) => row.description, searchable: true },
    { id: "status", header: t("columns.status"), value: (row) => row.status, cell: (row) => <ReferenceStatusBadge status={row.status} /> },
  ]
}

function pdaUserColumns(t: ExtendedT): ReadonlyArray<DataColumn<AssignedDeviceUser>> {
  return [
    { id: "user", header: t("columns.member"), value: (row) => row.user, searchable: true, alwaysVisible: true },
    {
      id: "deviceCode",
      header: t("columns.device"),
      value: (row) => row.deviceCode ?? "",
      searchable: true,
      cell: (row) => (row.deviceCode ? <Badge variant="secondary">{row.deviceCode}</Badge> : "—"),
    },
    { id: "status", header: t("columns.status"), value: (row) => row.status, cell: (row) => <ReferenceStatusBadge status={row.status} /> },
  ]
}


export function SpoolingReferences({
  projectId,
  canManage,
  reference,
}: {
  projectId: string
  canManage: boolean
  reference: ReferenceKeyOf<"spooling">
}) {
  const t = useTranslations("projectSetup.extendedReference")
  const tIssues = useTranslations("projectSetup.issues")
  const tc = useTranslations("common.actions")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<LoadedExtendedReferences | null>(null)
  const [addAnother, setAddAnother] = useState(false)
  const requestVersionRef = useRef(0)

  // Device dialog state
  const [isAddDeviceOpen, setIsAddDeviceOpen] = useState(false)
  const [devCode, setDevCode] = useState("")
  const [devDesc, setDevDesc] = useState("")
  const [devErrors, setDevErrors] = useState<Record<string, string>>({})
  const [isSubmittingDevice, setIsSubmittingDevice] = useState(false)
  const [deviceUserCandidates, setDeviceUserCandidates] = useState<DeviceUserCandidate[]>([])
  const [selectedMembershipId, setSelectedMembershipId] = useState("")
  const [selectedDeviceId, setSelectedDeviceId] = useState("")

  // Assembly state
  const [assemblyEnabled, setAssemblyEnabled] = useState(false)
  const [assemblySubId, setAssemblySubId] = useState<string>("")
  const [isSavingAssembly, setIsSavingAssembly] = useState(false)

  const fetchAll = useCallback(async () => {
    const version = ++requestVersionRef.current
    setLoading(true)
    setError(null)
    try {
      const client = getSupabaseBrowserClient()
      const [result, candidates] = await Promise.all([
        loadExtendedReferences(client, projectId),
        canManage ? listDeviceUserCandidates(client, projectId) : Promise.resolve([]),
      ])
      if (version === requestVersionRef.current) {
        setData(result)
        setDeviceUserCandidates(candidates)
        setAssemblyEnabled(result.assemblySettings.enabled)
        setAssemblySubId(result.assemblySettings.defaultSubcontractorId ?? "")
      }
    } catch (err: any) {
      if (version === requestVersionRef.current) setError(err.message || t("failedToLoad"))
    } finally {
      if (version === requestVersionRef.current) setLoading(false)
    }
  }, [canManage, projectId, t])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  // ── Device creation ──
  const handleAddDevice = async () => {
    const validation = validateDeviceInput({ code: devCode, description: devDesc })
    if (!validation.ok) {
      setDevErrors(formatFieldErrors(tIssues, validation.errors))
      return
    }
    setIsSubmittingDevice(true)
    try {
      const client = getSupabaseBrowserClient()
      await createDevice(client, projectId, validation.value)
      toast.success(t("deviceCreated"))
      if (!addAnother) setIsAddDeviceOpen(false)
      setDevCode("")
      setDevDesc("")
      setDevErrors({})
      fetchAll()
    } catch (err: any) {
      toast.error(err.message || t("deviceFailed"))
    } finally {
      setIsSubmittingDevice(false)
    }
  }

  const handleAssignDeviceUser = async () => {
    const validation = validateDeviceUserInput({ membershipId: selectedMembershipId, deviceId: selectedDeviceId || null })
    if (!validation.ok) { toast.error(Object.values(formatFieldErrors(tIssues, validation.errors)).join(", ")); return }
    setIsSubmittingDevice(true)
    try {
      await assignDeviceUser(getSupabaseBrowserClient(), projectId, validation.value)
      toast.success(t("pdaUserAssigned"))
      setSelectedMembershipId("")
      setSelectedDeviceId("")
      await fetchAll()
    } catch (err: any) {
      toast.error(err.message || t("pdaUserFailed"))
    } finally {
      setIsSubmittingDevice(false)
    }
  }

  // ── Assembly settings save ──
  const handleSaveAssembly = async () => {
    const input = { enabled: assemblyEnabled, defaultSubcontractorId: assemblySubId || null }
    const validation = validateAssemblySettingsInput(input)
    if (!validation.ok) {
      toast.error(Object.values(formatFieldErrors(tIssues, validation.errors)).join(", "))
      return
    }
    setIsSavingAssembly(true)
    try {
      const client = getSupabaseBrowserClient()
      await saveAssemblySettings(client, projectId, validation.value.enabled, validation.value.defaultSubcontractorId)
      toast.success(t("assemblySettingsSaved"))
      fetchAll()
    } catch (err: any) {
      toast.error(err.message || t("assemblySettingsFailed"))
    } finally {
      setIsSavingAssembly(false)
    }
  }

  const spoolingMaterialTypesCols = useMemo(() => spoolingMaterialTypeColumns(t), [t])
  const spoolingMaterialClassesCols = useMemo(() => spoolingMaterialClassColumns(t), [t])
  const spoolingChecklistCols = useMemo(() => spoolingChecklistColumns(t), [t])
  const ralCodesCols = useMemo(() => ralCodeColumns(t), [t])
  const paintMatrixCols = useMemo(() => paintMatrixColumns(t), [t])
  const devicesCols = useMemo(() => deviceColumns(t), [t])
  const pdaUsersCols = useMemo(() => pdaUserColumns(t), [t])

  const assignedUsers: ReadonlyArray<AssignedDeviceUser> = useMemo(() => {
    if (!data) return []
    if (canManage) {
      return deviceUserCandidates
        .filter((candidate) => candidate.isAssigned)
        .map((candidate) => ({
          id: candidate.membershipId,
          user: candidate.email ?? candidate.fullName,
          deviceCode: candidate.deviceCode,
          status: "active" as ReferenceStatus,
        }))
    }
    return data.deviceUsers.map((du) => ({
      id: du.id || du.membershipId,
      user: du.userEmail ?? du.membershipId,
      deviceCode: du.deviceCode ?? null,
      status: du.status,
    }))
  }, [canManage, deviceUserCandidates, data])

  if (loading) return <Skeleton className="h-64 w-full" />
  if (error || !data) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-6">
        <div className="flex items-center gap-3 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <p className="font-medium">{error || t("dataUnavailable")}</p>
        </div>
        <Button variant="outline" className="mt-4" onClick={fetchAll}>
          <RefreshCw className="mr-2 h-4 w-4" /> {t("retry")}
        </Button>
      </div>
    )
  }

  return (
    <>
      {/* ─── Spooling Material Types ─── */}
      {reference === "spooling-material-types" && (
        <ReferencePane
          title={t("spoolingMaterialTypesTitle")}
          description={t("spoolingMaterialTypesDesc")}
          count={data.spoolingMaterialTypes.length}
        >
          <ReferenceTable
            key={reference}
            columns={spoolingMaterialTypesCols}
            rows={data.spoolingMaterialTypes}
            rowId={(row) => row.id}
            emptyTitle={t("noSpoolingMaterialTypes")}
          />
        </ReferencePane>
      )}

      {/* ─── Spooling Material Classes ─── */}
      {reference === "spooling-material-classes" && (
        <ReferencePane
          title={t("spoolingMaterialClassesTitle")}
          description={t("spoolingMaterialClassesDesc")}
          count={data.spoolingMaterialClasses.length}
        >
          <ReferenceTable
            key={reference}
            columns={spoolingMaterialClassesCols}
            rows={data.spoolingMaterialClasses}
            rowId={(row) => row.id}
            emptyTitle={t("noSpoolingMaterialClasses")}
          />
        </ReferencePane>
      )}

      {/* ─── Spooling Checklist ─── */}
      {reference === "spooling-checklist" && (
        <ReferencePane
          title={t("spoolingChecklistTitle")}
          description={t("spoolingChecklistDesc")}
          count={data.spoolingChecklistItems.length}
        >
          <ReferenceTable
            key={reference}
            columns={spoolingChecklistCols}
            rows={data.spoolingChecklistItems}
            rowId={(row) => row.id}
            emptyTitle={t("noChecklistItems")}
          />
        </ReferencePane>
      )}

      {/* ─── RAL Codes ─── */}
      {reference === "ral-codes" && (
        <ReferencePane
          title={t("ralCodesTitle")}
          description={t("ralCodesDesc")}
          count={data.ralCodes.length}
        >
          <ReferenceTable
            key={reference}
            columns={ralCodesCols}
            rows={data.ralCodes}
            rowId={(row) => row.id}
            emptyTitle={t("noRalCodes")}
          />
        </ReferencePane>
      )}

      {/* ─── Paint Matrix ─── */}
      {reference === "paint-matrix" && (
        <ReferencePane
          title={t("paintMatrixTitle")}
          description={t("paintMatrixDesc")}
          count={data.paintMatrixRules.length}
        >
          <ReferenceTable
            key={reference}
            columns={paintMatrixCols}
            rows={data.paintMatrixRules}
            rowId={(row) => row.id}
            emptyTitle={t("noPaintMatrixRules")}
          />
        </ReferencePane>
      )}

      {/* ─── Assembly ─── */}
      {reference === "assembly" && (
        <ReferencePane
          title={t("assemblyConfigTitle")}
          description={t("assemblyConfigDesc")}
        >
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <Label htmlFor="assembly-toggle" className="text-sm font-medium">{t("assemblyEnabledLabel")}</Label>
              <Switch
                id="assembly-toggle"
                checked={assemblyEnabled}
                onCheckedChange={setAssemblyEnabled}
                disabled={!canManage}
              />
            </div>

            {assemblyEnabled && (
              <div>
                <Label htmlFor="assembly-sub">{t("defaultSubcontractorLabel")}</Label>
                <Input
                  id="assembly-sub"
                  value={assemblySubId}
                  onChange={(e) => setAssemblySubId(e.target.value)}
                  placeholder={t("subcontractorIdLabel")}
                  disabled={!canManage}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t("subcontractorHint")}
                </p>
              </div>
            )}

            {canManage && (
              <Button onClick={handleSaveAssembly} loading={isSavingAssembly}>{t("saveAssemblySettings")}</Button>
            )}

            {!canManage && (
              <p className="text-sm text-muted-foreground">
                {t("currentState", { state: data.assemblySettings.enabled ? t("enabled") : t("disabled") })}
                {data.assemblySettings.defaultSubcontractorCode && ` — ${data.assemblySettings.defaultSubcontractorCode}`}
              </p>
            )}
          </div>
        </ReferencePane>
      )}

      {/* ─── Devices ─── */}
      {reference === "devices" && (
        <ReferencePane
          title={t("trackingDevicesTitle")}
          description={t("trackingDevicesDesc")}
          count={data.devices.length}
          actions={
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={fetchAll} aria-label={tc("refresh")}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              {canManage && (
                <Button size="sm" onClick={() => setIsAddDeviceOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" /> {t("addDevice")}
                </Button>
              )}
            </div>
          }
        >
          <ReferenceTable
            key={reference}
            columns={devicesCols}
            rows={data.devices}
            rowId={(row) => row.id}
            emptyTitle={t("noDevices")}
          />
        </ReferencePane>
      )}

      {/* Device Users */}
      {reference === "pda-users" && (
        <ReferencePane
          title={t("pdaUsersTitle")}
          description={t("pdaUsersDesc")}
          count={assignedUsers.length}
        >
          {canManage && (
            <div className="mb-4 grid gap-3 rounded-md border p-3 md:grid-cols-[1fr_1fr_auto]">
              <label className="text-xs text-muted-foreground">
                {t("projectMemberLabel")}
                <select
                  className="mt-1 h-9 w-full rounded border bg-transparent px-3 text-sm"
                  value={selectedMembershipId}
                  onChange={(event) => setSelectedMembershipId(event.target.value)}
                >
                  <option value="">{t("selectMember")}</option>
                  {deviceUserCandidates.map((candidate) => (
                    <option key={candidate.membershipId} value={candidate.membershipId}>
                      {candidate.email ?? candidate.fullName} {candidate.deviceCode ? `— ${candidate.deviceCode}` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-muted-foreground">
                {t("trackingDeviceLabel")}
                <select
                  className="mt-1 h-9 w-full rounded border bg-transparent px-3 text-sm"
                  value={selectedDeviceId}
                  onChange={(event) => setSelectedDeviceId(event.target.value)}
                >
                  <option value="">{t("selectDevice")}</option>
                  {data.devices
                    .filter((device) => device.status === "active")
                    .map((device) => (
                      <option key={device.id} value={device.id}>
                        {device.code} — {device.description}
                      </option>
                    ))}
                </select>
              </label>
              <Button
                className="self-end"
                onClick={handleAssignDeviceUser}
                disabled={isSubmittingDevice || !selectedMembershipId || !selectedDeviceId}
              >
                {t("assign")}
              </Button>
            </div>
          )}
          <ReferenceTable
            key={reference}
            columns={pdaUsersCols}
            rows={assignedUsers}
            rowId={(row) => row.id}
            emptyTitle={t("noPdaUsers")}
          />
        </ReferencePane>
      )}

      {/* ─── Add Device Dialog ─── */}
      <Dialog open={isAddDeviceOpen} onOpenChange={(open) => { if (!open) { setIsAddDeviceOpen(false); setDevCode(""); setDevDesc(""); setDevErrors({}) } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("dialogs.addDeviceTitle")}</DialogTitle>
            <DialogDescription>{t("dialogs.addDeviceDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="dev-code">{t("dialogs.deviceCode")}</Label>
              <Input id="dev-code" value={devCode} onChange={(e) => setDevCode(e.target.value)} placeholder={t("dialogs.deviceCodePlaceholder")} />
              {devErrors.code && <p className="text-xs text-destructive mt-1">{devErrors.code}</p>}
            </div>
            <div>
              <Label htmlFor="dev-desc">{t("dialogs.deviceDesc")}</Label>
              <Input id="dev-desc" value={devDesc} onChange={(e) => setDevDesc(e.target.value)} placeholder={t("dialogs.deviceDescPlaceholder")} />
              {devErrors.description && <p className="text-xs text-destructive mt-1">{devErrors.description}</p>}
            </div>
          </div>
          <DialogFooter>
            <AddAnotherToggle id="device-add-another" checked={addAnother} onCheckedChange={setAddAnother} />
            <Button variant="outline" onClick={() => { setIsAddDeviceOpen(false); setDevCode(""); setDevDesc(""); setDevErrors({}) }}>{t("dialogs.cancel")}</Button>
            <Button onClick={handleAddDevice} loading={isSubmittingDevice}>{t("dialogs.create")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
