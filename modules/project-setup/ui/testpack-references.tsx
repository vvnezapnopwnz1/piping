"use client"

import { useTranslations } from "next-intl"
import { formatFieldErrors } from "./setup-field-issue"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { AlertCircle, Plus, RefreshCw } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { type DataColumn } from "@/components/ui/data-table"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import {
  loadExecutionReferences,
  createProjectTeam,
  createProjectSystem,
  createProjectSubsystem,
  createUnitTimeReference,
  createPunchCode,
  createLocation,
  createLocationCategory,
  updateLocationCapacity,
  setPunchCodeStatus,
  type LoadedExecutionReferences,
} from "../infrastructure/supabase-execution-reference-repository"
import {
  FLANGE_JOINTING_ACTIVITY,
  validateProjectTeamInput,
  validateSubsystemInput,
  validateUnitTimeReferenceInput,
  validatePunchCodeInput,
  validateLocationInput,
  validateLocationCapacity,
  type ProjectTeamType,
  type ProjectTeam,
  type ProjectSystem,
  type ProjectSubsystem,
  type LineService,
  type LocationCategory,
  type Location,
  type UnitTimeReference,
  type PunchCode,
} from "../domain/execution-reference"
import { validateReferenceIdentity } from "../domain/reference"
import { ReferenceStatusBadge } from "./reference-status-badge"
import { type ReferenceKeyOf } from "./reference-catalog"
import { ReferencePane, ReferenceTable } from "./reference-pane"
import { AddAnotherToggle } from "./add-another-toggle"

type ExecutionT = ReturnType<typeof useTranslations<"projectSetup.executionReference">>
type CodesT = ReturnType<typeof useTranslations<"codes">>

function teamColumns(t: ExecutionT, tc: CodesT): ReadonlyArray<DataColumn<ProjectTeam>> {
  return [
    { id: "code", header: t("columns.code"), value: (row) => row.code, searchable: true, alwaysVisible: true, className: "font-mono font-medium" },
    { id: "description", header: t("columns.description"), value: (row) => row.description, searchable: true },
    {
      id: "teamType",
      header: t("columns.teamType"),
      value: (row) => tc(`teamType.${row.teamType}`),
      searchable: true,
      cell: (row) => (
        <Badge variant="outline" className="text-xs">
          {tc(`teamType.${row.teamType}`)}
        </Badge>
      ),
    },
    { id: "status", header: t("columns.status"), value: (row) => row.status, cell: (row) => <ReferenceStatusBadge status={row.status} /> },
  ]
}

function punchCodeColumns(
  t: ExecutionT,
  canManage: boolean,
  handleDeactivatePunchCode: (id: string) => void,
): ReadonlyArray<DataColumn<PunchCode>> {
  const columns: DataColumn<PunchCode>[] = [
    { id: "code", header: t("columns.code"), value: (row) => row.code, searchable: true, alwaysVisible: true, className: "font-mono font-medium" },
    { id: "description", header: t("columns.description"), value: (row) => row.description, searchable: true },
    { id: "status", header: t("columns.status"), value: (row) => row.status, cell: (row) => <ReferenceStatusBadge status={row.status} /> },
  ]
  if (canManage) {
    columns.push({
      id: "actions",
      header: t("columns.actions"),
      sortable: false,
      value: () => "",
      cell: (row) =>
        row.status === "active" ? (
          <Button variant="ghost" size="sm" onClick={function() { void handleDeactivatePunchCode(row.id) }}>
            {t("deactivate")}
          </Button>
        ) : null,
    })
  }
  return columns
}

function systemColumns(t: ExecutionT): ReadonlyArray<DataColumn<ProjectSystem>> {
  return [
    { id: "code", header: t("columns.code"), value: (row) => row.code, searchable: true, alwaysVisible: true, className: "font-mono font-medium" },
    { id: "description", header: t("columns.description"), value: (row) => row.description, searchable: true },
    { id: "status", header: t("columns.status"), value: (row) => row.status, cell: (row) => <ReferenceStatusBadge status={row.status} /> },
  ]
}

function subsystemColumns(t: ExecutionT): ReadonlyArray<DataColumn<ProjectSubsystem>> {
  return [
    { id: "code", header: t("columns.code"), value: (row) => row.code, searchable: true, alwaysVisible: true, className: "font-mono font-medium" },
    { id: "description", header: t("columns.description"), value: (row) => row.description, searchable: true },
    {
      id: "system",
      header: t("columns.system"),
      value: (row) => row.systemCode ?? "",
      searchable: true,
      cell: (row) => (row.systemCode ? <Badge variant="secondary">{row.systemCode}</Badge> : "—"),
    },
    { id: "status", header: t("columns.status"), value: (row) => row.status, cell: (row) => <ReferenceStatusBadge status={row.status} /> },
  ]
}

function lineServiceColumns(t: ExecutionT): ReadonlyArray<DataColumn<LineService>> {
  return [
    { id: "code", header: t("columns.code"), value: (row) => row.code, searchable: true, alwaysVisible: true, className: "font-mono font-medium" },
    { id: "description", header: t("columns.description"), value: (row) => row.description, searchable: true },
    { id: "status", header: t("columns.status"), value: (row) => row.status, cell: (row) => <ReferenceStatusBadge status={row.status} /> },
  ]
}

function unitTimeColumns(t: ExecutionT): ReadonlyArray<DataColumn<UnitTimeReference>> {
  return [
    { id: "activity", header: t("columns.activity"), value: (row) => row.activity, searchable: true, alwaysVisible: true, className: "font-mono font-medium" },
    { id: "projectUt", header: t("columns.projectUt"), value: (row) => row.projectUt, numeric: true },
    { id: "standardReference", header: t("columns.standardReference"), value: (row) => row.standardReference, searchable: true, cell: (row) => row.standardReference || "—", className: "text-muted-foreground" },
    { id: "status", header: t("columns.status"), value: (row) => row.status, cell: (row) => <ReferenceStatusBadge status={row.status} /> },
  ]
}

function locationCategoryColumns(t: ExecutionT): ReadonlyArray<DataColumn<LocationCategory>> {
  return [
    { id: "code", header: t("columns.code"), value: (row) => row.code, searchable: true, alwaysVisible: true, className: "font-mono font-medium" },
    { id: "description", header: t("columns.description"), value: (row) => row.description, searchable: true },
    { id: "status", header: t("columns.status"), value: (row) => row.status, cell: (row) => <ReferenceStatusBadge status={row.status} /> },
  ]
}

function locationColumns(
  t: ExecutionT,
  canManage: boolean,
  onEditCapacity: (loc: Location) => void,
): ReadonlyArray<DataColumn<Location>> {
  const columns: DataColumn<Location>[] = [
    { id: "code", header: t("columns.code"), value: (row) => row.code, searchable: true, alwaysVisible: true, className: "font-mono font-medium" },
    { id: "description", header: t("columns.description"), value: (row) => row.description, searchable: true },
    {
      id: "category",
      header: t("columns.category"),
      value: (row) => row.categoryCode ?? "",
      searchable: true,
      cell: (row) => (row.categoryCode ? <Badge variant="secondary">{row.categoryCode}</Badge> : "—"),
    },
    {
      id: "progressColumns",
      header: t("columns.progressColumns"),
      value: (row) => row.mappedProgressColumns.join(", "),
      searchable: true,
      cell: (row) =>
        row.mappedProgressColumns.length > 0 ? (
          <Badge variant="outline" className="text-xs">
            {row.mappedProgressColumns.join(", ")}
          </Badge>
        ) : (
          "—"
        ),
    },
    {
      id: "capacity",
      header: t("columns.capacity"),
      value: (row) => row.capacity ?? t("notConfigured"),
      cell: (row) => (
        <Badge variant={row.capacity === null ? "outline" : "secondary"}>
          {row.capacity ?? t("notConfigured")}
        </Badge>
      ),
    },
    { id: "status", header: t("columns.status"), value: (row) => row.status, cell: (row) => <ReferenceStatusBadge status={row.status} /> },
  ]
  if (canManage) {
    columns.push({
      id: "actions",
      header: t("columns.actions"),
      sortable: false,
      value: () => "",
      cell: (row) => (
        <Button size="sm" variant="ghost" onClick={function() { onEditCapacity(row) }}>
          {t("editCapacity")}
        </Button>
      ),
    })
  }
  return columns
}

const TEAM_TYPES: readonly ProjectTeamType[] = ["line_check", "blinding", "finishing", "reinstatement", "jointer"]

export function TestpackReferences({
  projectId,
  canManage,
  reference,
}: {
  projectId: string
  canManage: boolean
  reference: ReferenceKeyOf<"testpack">
}) {
  const tc = useTranslations("codes")
  const [loading, setLoading] = useState(true)
  const [addAnother, setAddAnother] = useState(false)
  const tIssues = useTranslations("projectSetup.issues")
  const t = useTranslations("projectSetup.executionReference")


  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<LoadedExecutionReferences | null>(null)
  const requestVersionRef = useRef(0)

  // Team dialog state
  const [isAddTeamOpen, setIsAddTeamOpen] = useState(false)
  const [teamCode, setTeamCode] = useState("")
  const [teamDesc, setTeamDesc] = useState("")
  const [teamType, setTeamType] = useState<ProjectTeamType>("line_check")
  const [teamErrors, setTeamErrors] = useState<Record<string, string>>({})
  const [isSubmittingTeam, setIsSubmittingTeam] = useState(false)

  // System dialog state
  const [isAddSystemOpen, setIsAddSystemOpen] = useState(false)
  const [sysCode, setSysCode] = useState("")
  const [sysDesc, setSysDesc] = useState("")
  const [sysErrors, setSysErrors] = useState<Record<string, string>>({})
  const [isSubmittingSystem, setIsSubmittingSystem] = useState(false)

  // Subsystem dialog state
  const [isAddSubsystemOpen, setIsAddSubsystemOpen] = useState(false)
  const [subCode, setSubCode] = useState("")
  const [subDesc, setSubDesc] = useState("")
  const [subSystemId, setSubSystemId] = useState("")
  const [subErrors, setSubErrors] = useState<Record<string, string>>({})
  const [isSubmittingSubsystem, setIsSubmittingSubsystem] = useState(false)

  // Flange unit-time create dialog (the activity is intentionally fixed)
  const [isAddUnitTimeOpen, setIsAddUnitTimeOpen] = useState(false)
  const [unitTimeUt, setUnitTimeUt] = useState("")
  const [unitTimeStandard, setUnitTimeStandard] = useState("")
  const [unitTimeErrors, setUnitTimeErrors] = useState<Record<string, string>>({})
  const [isSubmittingUnitTime, setIsSubmittingUnitTime] = useState(false)

  // Line Service dialog state
  const [isAddLineServiceOpen, setIsAddLineServiceOpen] = useState(false)
  const [lsCode, setLsCode] = useState("")
  const [lsDesc, setLsDesc] = useState("")
  const [lsErrors, setLsErrors] = useState<Record<string, string>>({})
  const [isSubmittingLineService, setIsSubmittingLineService] = useState(false)

  // Punch-code dialog state
  const [isAddPunchCodeOpen, setIsAddPunchCodeOpen] = useState(false)
  const [punchCode, setPunchCode] = useState("")
  const [punchDescription, setPunchDescription] = useState("")
  const [punchErrors, setPunchErrors] = useState<Record<string, string>>({})
  const [isSubmittingPunchCode, setIsSubmittingPunchCode] = useState(false)

  // Tracking-location dialog state
  const [isAddLocationCategoryOpen, setIsAddLocationCategoryOpen] = useState(false)
  const [locationCategoryCode, setLocationCategoryCode] = useState("")
  const [locationCategoryDescription, setLocationCategoryDescription] = useState("")
  const [isAddLocationOpen, setIsAddLocationOpen] = useState(false)
  const [locationCategoryId, setLocationCategoryId] = useState("")
  const [locationCode, setLocationCode] = useState("")
  const [locationDescription, setLocationDescription] = useState("")
  const [locationProgressColumns, setLocationProgressColumns] = useState("")
  const [locationCapacity, setLocationCapacity] = useState("")
  const [locationErrors, setLocationErrors] = useState<Record<string, string>>({})
  const [capacityLocationId, setCapacityLocationId] = useState<string | null>(null)
  const [capacityValue, setCapacityValue] = useState("")
  const [isSubmittingLocation, setIsSubmittingLocation] = useState(false)

  const fetchAll = useCallback(async () => {
    const version = ++requestVersionRef.current
    setLoading(true)
    setError(null)
    try {
      const client = getSupabaseBrowserClient()
      const result = await loadExecutionReferences(client, projectId)
      if (version === requestVersionRef.current) setData(result)
    } catch (err: any) {
      if (version === requestVersionRef.current) setError(err.message || t("failedToLoad"))
    } finally {
      if (version === requestVersionRef.current) setLoading(false)
    }
  }, [projectId, t])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  // ── Team creation ──
  const handleAddTeam = async () => {
    const validation = validateProjectTeamInput({ code: teamCode, description: teamDesc, teamType })
    if (!validation.ok) {
      setTeamErrors(validation.errors)
      return
    }
    setIsSubmittingTeam(true)
    try {
      const client = getSupabaseBrowserClient()
      await createProjectTeam(client, projectId, validation.value)
      toast.success(t("teamCreated"))
      if (!addAnother) setIsAddTeamOpen(false)
      setTeamCode("")
      setTeamDesc("")
      if (!addAnother) setTeamType("line_check")
      setTeamErrors({})
      fetchAll()
    } catch (err: any) {
      toast.error(err.message || t("teamFailed"))
    } finally {
      setIsSubmittingTeam(false)
    }
  }

  const resetTeamForm = () => {
    setTeamCode("")
    setTeamDesc("")
    setTeamType("line_check")
    setTeamErrors({})
  }

  const handleAddLocationCategory = async () => {
    const validation = validateReferenceIdentity({ code: locationCategoryCode, description: locationCategoryDescription })
    if (!validation.ok) { setLocationErrors(formatFieldErrors(tIssues, validation.errors)); return }
    setIsSubmittingLocation(true)
    try {
      await createLocationCategory(getSupabaseBrowserClient(), projectId, validation.value)
      toast.success(t("locationCategoryCreated"))
      if (!addAnother) setIsAddLocationCategoryOpen(false)
      setLocationCategoryCode("")
      setLocationCategoryDescription("")
      setLocationErrors({})
      await fetchAll()
    } catch (err: any) {
      toast.error(err.message || t("locationCategoryFailed"))
    } finally {
      setIsSubmittingLocation(false)
    }
  }

  const handleAddLocation = async () => {
    const input = {
      categoryId: locationCategoryId,
      code: locationCode,
      description: locationDescription,
      mappedProgressColumns: locationProgressColumns.split(",").map((value) => value.trim()).filter(Boolean),
      capacity: Number(locationCapacity),
    }
    const validation = validateLocationInput(input)
    if (!validation.ok) { setLocationErrors(validation.errors); return }
    setIsSubmittingLocation(true)
    try {
      await createLocation(getSupabaseBrowserClient(), projectId, validation.value)
      toast.success(t("locationCreated"))
      if (!addAnother) setIsAddLocationOpen(false)
      if (!addAnother) setLocationCategoryId("")
      setLocationCode("")
      setLocationDescription("")
      setLocationProgressColumns("")
      setLocationCapacity("")
      setLocationErrors({})
      await fetchAll()
    } catch (err: any) {
      toast.error(err.message || t("locationFailed"))
    } finally {
      setIsSubmittingLocation(false)
    }
  }

  const handleUpdateLocationCapacity = async () => {
    if (!capacityLocationId) return
    const validation = validateLocationCapacity(Number(capacityValue))
    if (!validation.ok) { setLocationErrors(validation.errors); return }
    setIsSubmittingLocation(true)
    try {
      await updateLocationCapacity(getSupabaseBrowserClient(), projectId, capacityLocationId, validation.value.capacity)
      toast.success(t("locationCapacityUpdated"))
      setCapacityLocationId(null)
      setCapacityValue("")
      setLocationErrors({})
      await fetchAll()
    } catch (err: any) {
      toast.error(err.message || t("locationCapacityFailed"))
    } finally {
      setIsSubmittingLocation(false)
    }
  }

  // ── System creation ──
  const handleAddSystem = async () => {
    const validation = validateReferenceIdentity({ code: sysCode, description: sysDesc })
    if (!validation.ok) {
      setSysErrors(formatFieldErrors(tIssues, validation.errors))
      return
    }
    setIsSubmittingSystem(true)
    try {
      const client = getSupabaseBrowserClient()
      await createProjectSystem(client, projectId, { code: sysCode, description: sysDesc })
      toast.success(t("systemCreated"))
      if (!addAnother) setIsAddSystemOpen(false)
      setSysCode("")
      setSysDesc("")
      setSysErrors({})
      fetchAll()
    } catch (err: any) {
      toast.error(err.message || t("systemFailed"))
    } finally {
      setIsSubmittingSystem(false)
    }
  }

  // ── Subsystem creation ──
  const handleAddSubsystem = async () => {
    const validation = validateSubsystemInput({ code: subCode, description: subDesc, systemId: subSystemId })
    if (!validation.ok) {
      setSubErrors(validation.errors)
      return
    }
    setIsSubmittingSubsystem(true)
    try {
      const client = getSupabaseBrowserClient()
      await createProjectSubsystem(client, projectId, validation.value)
      toast.success(t("subsystemCreated"))
      if (!addAnother) setIsAddSubsystemOpen(false)
      setSubCode("")
      setSubDesc("")
      if (!addAnother) setSubSystemId("")
      setSubErrors({})
      fetchAll()
    } catch (err: any) {
      toast.error(err.message || t("subsystemFailed"))
    } finally {
      setIsSubmittingSubsystem(false)
    }
  }

  // ── Line Service creation (reuses generic create pattern) ──
  const handleAddLineService = async () => {
    const validation = validateReferenceIdentity({ code: lsCode, description: lsDesc })
    if (!validation.ok) {
      setLsErrors(formatFieldErrors(tIssues, validation.errors))
      return
    }
    setIsSubmittingLineService(true)
    try {
      const client = getSupabaseBrowserClient()
      await client
        .from("project_line_services")
        .insert({ project_id: projectId, code: lsCode.trim().toUpperCase(), description: lsDesc.trim() })
        .select("id")
        .single()
        .then(({ error }) => { if (error) throw new Error(error.message) })
      toast.success(t("lineServiceCreated"))
      if (!addAnother) setIsAddLineServiceOpen(false)
      setLsCode("")
      setLsDesc("")
      setLsErrors({})
      fetchAll()
    } catch (err: any) {
      toast.error(err.message || t("lineServiceFailed"))
    } finally {
      setIsSubmittingLineService(false)
    }
  }

  const handleAddUnitTimeReference = async (e: React.FormEvent) => {
    e.preventDefault()
    const validation = validateUnitTimeReferenceInput({
      activity: FLANGE_JOINTING_ACTIVITY,
      projectUt: Number(unitTimeUt),
      standardReference: unitTimeStandard,
    })
    if (!validation.ok) {
      setUnitTimeErrors(validation.errors)
      return
    }

    setUnitTimeErrors({})
    setIsSubmittingUnitTime(true)
    try {
      const unitTime = await createUnitTimeReference(getSupabaseBrowserClient(), projectId, validation.value)
      setData((prev) => prev ? { ...prev, unitTimeReferences: [...prev.unitTimeReferences, unitTime].sort((a, b) => a.activity.localeCompare(b.activity)) } : null)
      setUnitTimeUt("")
      setUnitTimeStandard("")
      if (!addAnother) setIsAddUnitTimeOpen(false)
      toast.success(t("flangeUnitTimeCreated"))
    } catch (err: any) {
      toast.error(err.message || t("flangeUnitTimeFailed"))
    } finally {
      setIsSubmittingUnitTime(false)
    }
  }

  const handleAddPunchCode = async (e: React.FormEvent) => {
    e.preventDefault()
    const validation = validatePunchCodeInput({ code: punchCode, description: punchDescription })
    if (!validation.ok) {
      setPunchErrors(validation.errors)
      return
    }

    setPunchErrors({})
    setIsSubmittingPunchCode(true)
    try {
      const created = await createPunchCode(getSupabaseBrowserClient(), projectId, validation.value)
      setData((prev) => prev ? { ...prev, punchCodes: [...prev.punchCodes, created].sort((a, b) => a.code.localeCompare(b.code)) } : null)
      setPunchCode("")
      setPunchDescription("")
      if (!addAnother) setIsAddPunchCodeOpen(false)
      toast.success(t("punchCodeCreated"))
    } catch (err: any) {
      toast.error(err.message || t("punchCodeFailed"))
    } finally {
      setIsSubmittingPunchCode(false)
    }
  }

  const handleDeactivatePunchCode = useCallback(async (id: string) => {
    try {
      await setPunchCodeStatus(getSupabaseBrowserClient(), projectId, id, "inactive")
      setData((prev) => prev ? {
        ...prev,
        punchCodes: prev.punchCodes.map((item) => item.id === id ? { ...item, status: "inactive" } : item),
      } : null)
      toast.success(t("punchCodeDeactivated"))
    } catch (err: any) {
      toast.error(err.message || t("punchCodeDeactivateFailed"))
    }
  }, [projectId, t])

  const teamsCols = useMemo(() => teamColumns(t, tc), [t, tc])
  const punchCodesCols = useMemo(
    () => punchCodeColumns(t, canManage, (id) => void handleDeactivatePunchCode(id)),
    [t, canManage, handleDeactivatePunchCode],
  )
  const systemsCols = useMemo(() => systemColumns(t), [t])
  const subsystemsCols = useMemo(() => subsystemColumns(t), [t])
  const lineServicesCols = useMemo(() => lineServiceColumns(t), [t])
  const unitTimeCols = useMemo(() => unitTimeColumns(t), [t])
  const locationCategoriesCols = useMemo(() => locationCategoryColumns(t), [t])
  const locationsCols = useMemo(
    () =>
      locationColumns(t, canManage, (loc) => {
        setCapacityLocationId(loc.id)
        setCapacityValue(loc.capacity?.toString() ?? "")
      }),
    [t, canManage],
  )

  if (loading) return <Skeleton className="h-64 w-full" />
  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-6">
        <div className="flex items-center gap-3 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <p className="font-medium">{error}</p>
        </div>
        <Button variant="outline" className="mt-4" onClick={fetchAll}>
          <RefreshCw className="mr-2 h-4 w-4" /> {t("retry")}
        </Button>
      </div>
    )
  }
  if (!data) return null

  const activeSystems = data.systems.filter((s) => s.status === "active")

  return (
    <>
      {/* ─── Teams ─── */}
      {reference === "teams" && (
        <ReferencePane
          title={t("teamsTitle")}
          description={t("teamsDesc")}
          count={data.teams.length}
          actions={
            canManage ? (
              <Button size="sm" onClick={() => setIsAddTeamOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> {t("addTeam")}
              </Button>
            ) : null
          }
        >
          <ReferenceTable
            key={reference}
            columns={teamsCols}
            rows={data.teams}
            rowId={(row) => row.id}
            emptyTitle={t("noTeams")}
          />
        </ReferencePane>
      )}

      {/* ─── Punch codes ─── */}
      {reference === "punch-codes" && (
        <ReferencePane
          title={t("punchCodesTitle")}
          description={t("punchCodesDesc")}
          count={data.punchCodes.length}
          actions={
            canManage ? (
              <Button size="sm" onClick={() => setIsAddPunchCodeOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> {t("addPunchCode")}
              </Button>
            ) : null
          }
        >
          <ReferenceTable
            key={reference}
            columns={punchCodesCols}
            rows={data.punchCodes}
            rowId={(row) => row.id}
            emptyTitle={t("noPunchCodes")}
          />
        </ReferencePane>
      )}

      {/* ─── Systems ─── */}
      {reference === "systems" && (
        <ReferencePane
          title={t("systemsTitle")}
          description={t("systemsDesc")}
          count={data.systems.length}
          actions={
            canManage ? (
              <Button size="sm" onClick={() => setIsAddSystemOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> {t("addSystem")}
              </Button>
            ) : null
          }
        >
          <ReferenceTable
            key={reference}
            columns={systemsCols}
            rows={data.systems}
            rowId={(row) => row.id}
            emptyTitle={t("noSystems")}
          />
        </ReferencePane>
      )}

      {/* ─── Subsystems ─── */}
      {reference === "subsystems" && (
        <ReferencePane
          title={t("subsystemsTitle")}
          description={t("subsystemsDesc")}
          count={data.subsystems.length}
          actions={
            canManage ? (
              <Button
                size="sm"
                disabled={activeSystems.length === 0}
                onClick={() => {
                  setSubSystemId(activeSystems[0]?.id ?? "")
                  setIsAddSubsystemOpen(true)
                }}
              >
                <Plus className="mr-2 h-4 w-4" /> {t("addSubsystem")}
              </Button>
            ) : null
          }
        >
          <ReferenceTable
            key={reference}
            columns={subsystemsCols}
            rows={data.subsystems}
            rowId={(row) => row.id}
            emptyTitle={t("noSubsystems")}
          />
        </ReferencePane>
      )}

      {/* ─── Line Services ─── */}
      {reference === "line-services" && (
        <ReferencePane
          title={t("lineServicesTitle")}
          description={t("lineServicesDesc")}
          count={data.lineServices.length}
          actions={
            canManage ? (
              <Button size="sm" onClick={() => setIsAddLineServiceOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> {t("addLineService")}
              </Button>
            ) : null
          }
        >
          <ReferenceTable
            key={reference}
            columns={lineServicesCols}
            rows={data.lineServices}
            rowId={(row) => row.id}
            emptyTitle={t("noLineServices")}
          />
        </ReferencePane>
      )}

      {/* ─── Unit of Time References ─── */}
      {reference === "unit-time" && (
        <ReferencePane
          title={t("unitTimeTitle")}
          description={t("unitTimeDesc")}
          count={data.unitTimeReferences.length}
          actions={
            canManage ? (
              <Button size="sm" onClick={() => setIsAddUnitTimeOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> {t("addFlangeUnitTime")}
              </Button>
            ) : null
          }
        >
          <ReferenceTable
            key={reference}
            columns={unitTimeCols}
            rows={data.unitTimeReferences}
            rowId={(row) => row.id}
            emptyTitle={t("noUnitTime")}
          />
        </ReferencePane>
      )}

      {/* ─── Tracking: Location Categories & Locations ─── */}
      {reference === "location-categories" && (
        <ReferencePane
          title={t("locationCategoriesTitle")}
          description={t("locationCategoriesDesc")}
          count={data.locationCategories.length}
          actions={
            canManage ? (
              <Button size="sm" onClick={() => setIsAddLocationCategoryOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> {t("addCategory")}
              </Button>
            ) : null
          }
        >
          <ReferenceTable
            key={reference}
            columns={locationCategoriesCols}
            rows={data.locationCategories}
            rowId={(row) => row.id}
            emptyTitle={t("noLocationCategories")}
          />
        </ReferencePane>
      )}

      {reference === "locations" && (
        <ReferencePane
          title={t("locationsTitle")}
          description={t("locationsDesc")}
          count={data.locations.length}
          actions={
            canManage ? (
              <Button
                size="sm"
                onClick={() => {
                  setLocationCategoryId(data.locationCategories[0]?.id ?? "")
                  setIsAddLocationOpen(true)
                }}
                disabled={data.locationCategories.length === 0}
              >
                <Plus className="mr-2 h-4 w-4" /> {t("addLocation")}
              </Button>
            ) : null
          }
        >
          <ReferenceTable
            key={reference}
            columns={locationsCols}
            rows={data.locations}
            rowId={(row) => row.id}
            emptyTitle={t("noLocations")}
          />
        </ReferencePane>
      )}

      {/* ─── Pressure Unit ─── */}
      {reference === "pressure-unit" && (
        <ReferencePane
          title={t("pressureUnitTitle")}
          description={t("pressureUnitDesc")}
        >
          {data.pressureUnit ? (
            <div className="flex items-center gap-3 p-3 border rounded-md">
              <Badge variant="default">{data.pressureUnit.unit.toUpperCase()}</Badge>
              <span className="text-sm text-muted-foreground">{t("activeForProject")}</span>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm py-4 text-center">{t("noPressureUnit")}</p>
          )}
        </ReferencePane>
      )}

      {/* ─── Dialogs ─── */}

      <Dialog open={isAddLocationCategoryOpen} onOpenChange={setIsAddLocationCategoryOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("dialogs.addLocationCategoryTitle")}</DialogTitle><DialogDescription>{t("dialogs.addLocationCategoryDesc")}</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div><Label htmlFor="location-category-code">{t("dialogs.codeLabel")}</Label><Input id="location-category-code" value={locationCategoryCode} onChange={(event) => setLocationCategoryCode(event.target.value)} />{locationErrors.code && <p className="text-xs text-destructive">{locationErrors.code}</p>}</div>
            <div><Label htmlFor="location-category-description">{t("dialogs.descLabel")}</Label><Input id="location-category-description" value={locationCategoryDescription} onChange={(event) => setLocationCategoryDescription(event.target.value)} />{locationErrors.description && <p className="text-xs text-destructive">{locationErrors.description}</p>}</div>
          </div>
          <DialogFooter>
            <AddAnotherToggle id="location-category-add-another" checked={addAnother} onCheckedChange={setAddAnother} />
            <Button variant="outline" onClick={() => setIsAddLocationCategoryOpen(false)}>{t("dialogs.cancel")}</Button>
            <Button onClick={handleAddLocationCategory} disabled={isSubmittingLocation}>{t("dialogs.create")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddLocationOpen} onOpenChange={setIsAddLocationOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("dialogs.addLocationTitle")}</DialogTitle><DialogDescription>{t("dialogs.addLocationDesc")}</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div><Label htmlFor="location-category">{t("dialogs.categoryLabel")}</Label><Select value={locationCategoryId} onValueChange={setLocationCategoryId}><SelectTrigger id="location-category" className="w-full"><SelectValue placeholder={t("dialogs.selectCategory")} /></SelectTrigger><SelectContent>{data.locationCategories.map((category) => <SelectItem key={category.id} value={category.id}>{category.code} — {category.description}</SelectItem>)}</SelectContent></Select>{locationErrors.categoryId && <p className="text-xs text-destructive">{locationErrors.categoryId}</p>}</div>
            <div><Label htmlFor="location-code">{t("dialogs.codeLabel")}</Label><Input id="location-code" value={locationCode} onChange={(event) => setLocationCode(event.target.value)} />{locationErrors.code && <p className="text-xs text-destructive">{locationErrors.code}</p>}</div>
            <div><Label htmlFor="location-description">{t("dialogs.descLabel")}</Label><Input id="location-description" value={locationDescription} onChange={(event) => setLocationDescription(event.target.value)} />{locationErrors.description && <p className="text-xs text-destructive">{locationErrors.description}</p>}</div>
            <div><Label htmlFor="location-capacity">{t("dialogs.capacityFieldLabel")}</Label><Input id="location-capacity" type="number" min="1" value={locationCapacity} onChange={(event) => setLocationCapacity(event.target.value)} />{locationErrors.capacity && <p className="text-xs text-destructive">{locationErrors.capacity}</p>}</div>
            <div><Label htmlFor="location-progress">{t("dialogs.progressColumnsLabel")}</Label><Input id="location-progress" value={locationProgressColumns} onChange={(event) => setLocationProgressColumns(event.target.value)} placeholder={t("dialogs.progressColumnsPlaceholder")} /></div>
          </div>
          <DialogFooter>
            <AddAnotherToggle id="location-add-another" checked={addAnother} onCheckedChange={setAddAnother} />
            <Button variant="outline" onClick={() => setIsAddLocationOpen(false)}>{t("dialogs.cancel")}</Button>
            <Button onClick={handleAddLocation} disabled={isSubmittingLocation}>{t("dialogs.create")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={capacityLocationId !== null} onOpenChange={(open) => { if (!open) { setCapacityLocationId(null); setCapacityValue(""); setLocationErrors({}) } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("dialogs.editCapacityTitle")}</DialogTitle><DialogDescription>{t("dialogs.editCapacityDesc")}</DialogDescription></DialogHeader>
          <div><Label htmlFor="edit-location-capacity">{t("dialogs.capacityFieldLabel")}</Label><Input id="edit-location-capacity" type="number" min="1" value={capacityValue} onChange={(event) => setCapacityValue(event.target.value)} />{locationErrors.capacity && <p className="text-xs text-destructive">{locationErrors.capacity}</p>}</div>
          <DialogFooter><Button variant="outline" onClick={() => setCapacityLocationId(null)}>{t("dialogs.cancel")}</Button><Button onClick={handleUpdateLocationCapacity} disabled={isSubmittingLocation}>{t("dialogs.save")}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Team Dialog */}
      <Dialog open={isAddTeamOpen} onOpenChange={(open) => { if (!open) { setIsAddTeamOpen(false); resetTeamForm() } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("dialogs.addTeamTitle")}</DialogTitle>
            <DialogDescription>{t("dialogs.addTeamDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="team-code">{t("dialogs.codeLabel")}</Label>
              <Input id="team-code" value={teamCode} onChange={(e) => setTeamCode(e.target.value)} placeholder={t("dialogs.teamCodePlaceholder")} />
              {teamErrors.code && <p className="text-xs text-destructive mt-1">{teamErrors.code}</p>}
            </div>
            <div>
              <Label htmlFor="team-desc">{t("dialogs.descLabel")}</Label>
              <Input id="team-desc" value={teamDesc} onChange={(e) => setTeamDesc(e.target.value)} placeholder={t("dialogs.teamDescPlaceholder")} />
              {teamErrors.description && <p className="text-xs text-destructive mt-1">{teamErrors.description}</p>}
            </div>
            <div>
              <Label htmlFor="team-type">{t("dialogs.teamTypeLabel")}</Label>
              <Select value={teamType} onValueChange={(v) => setTeamType(v as ProjectTeamType)}>
                <SelectTrigger id="team-type" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TEAM_TYPES.map((k) => (
                    <SelectItem key={k} value={k}>{tc(`teamType.${k}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {teamErrors.teamType && <p className="text-xs text-destructive mt-1">{teamErrors.teamType}</p>}
            </div>
          </div>
          <DialogFooter>
            <AddAnotherToggle id="team-add-another" checked={addAnother} onCheckedChange={setAddAnother} />
            <Button variant="outline" onClick={() => { setIsAddTeamOpen(false); resetTeamForm() }}>{t("dialogs.cancel")}</Button>
            <Button onClick={handleAddTeam} loading={isSubmittingTeam}>{t("dialogs.create")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add System Dialog */}
      <Dialog open={isAddSystemOpen} onOpenChange={(open) => { if (!open) { setIsAddSystemOpen(false); setSysCode(""); setSysDesc(""); setSysErrors({}) } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("dialogs.addSystemTitle")}</DialogTitle>
            <DialogDescription>{t("dialogs.addSystemDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="sys-code">{t("dialogs.codeLabel")}</Label>
              <Input id="sys-code" value={sysCode} onChange={(e) => setSysCode(e.target.value)} placeholder={t("dialogs.sysCodePlaceholder")} />
              {sysErrors.code && <p className="text-xs text-destructive mt-1">{sysErrors.code}</p>}
            </div>
            <div>
              <Label htmlFor="sys-desc">{t("dialogs.descLabel")}</Label>
              <Input id="sys-desc" value={sysDesc} onChange={(e) => setSysDesc(e.target.value)} placeholder={t("dialogs.sysDescPlaceholder")} />
              {sysErrors.description && <p className="text-xs text-destructive mt-1">{sysErrors.description}</p>}
            </div>
          </div>
          <DialogFooter>
            <AddAnotherToggle id="system-add-another" checked={addAnother} onCheckedChange={setAddAnother} />
            <Button variant="outline" onClick={() => { setIsAddSystemOpen(false); setSysCode(""); setSysDesc(""); setSysErrors({}) }}>{t("dialogs.cancel")}</Button>
            <Button onClick={handleAddSystem} loading={isSubmittingSystem}>{t("dialogs.create")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Subsystem Dialog */}
      <Dialog open={isAddSubsystemOpen} onOpenChange={(open) => { if (!open) { setIsAddSubsystemOpen(false); setSubCode(""); setSubDesc(""); setSubSystemId(""); setSubErrors({}) } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("dialogs.addSubsystemTitle")}</DialogTitle>
            <DialogDescription>{t("dialogs.addSubsystemDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="sub-system">{t("dialogs.parentSystemLabel")}</Label>
              <Select value={subSystemId} onValueChange={setSubSystemId}>
                <SelectTrigger id="sub-system" className="w-full"><SelectValue placeholder={t("dialogs.selectSystem")} /></SelectTrigger>
                <SelectContent>
                  {activeSystems.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.code} — {s.description}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {subErrors.systemId && <p className="text-xs text-destructive mt-1">{subErrors.systemId}</p>}
            </div>
            <div>
              <Label htmlFor="sub-code">{t("dialogs.codeLabel")}</Label>
              <Input id="sub-code" value={subCode} onChange={(e) => setSubCode(e.target.value)} placeholder={t("dialogs.subCodePlaceholder")} />
              {subErrors.code && <p className="text-xs text-destructive mt-1">{subErrors.code}</p>}
            </div>
            <div>
              <Label htmlFor="sub-desc">{t("dialogs.descLabel")}</Label>
              <Input id="sub-desc" value={subDesc} onChange={(e) => setSubDesc(e.target.value)} placeholder={t("dialogs.subDescPlaceholder")} />
              {subErrors.description && <p className="text-xs text-destructive mt-1">{subErrors.description}</p>}
            </div>
          </div>
          <DialogFooter>
            <AddAnotherToggle id="subsystem-add-another" checked={addAnother} onCheckedChange={setAddAnother} />
            <Button variant="outline" onClick={() => { setIsAddSubsystemOpen(false) }}>{t("dialogs.cancel")}</Button>
            <Button onClick={handleAddSubsystem} loading={isSubmittingSubsystem}>{t("dialogs.create")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Line Service Dialog */}
      <Dialog open={isAddLineServiceOpen} onOpenChange={(open) => { if (!open) { setIsAddLineServiceOpen(false); setLsCode(""); setLsDesc(""); setLsErrors({}) } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("dialogs.addLineServiceTitle")}</DialogTitle>
            <DialogDescription>{t("dialogs.addLineServiceDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="ls-code">{t("dialogs.codeLabel")}</Label>
              <Input id="ls-code" value={lsCode} onChange={(e) => setLsCode(e.target.value)} placeholder={t("dialogs.lsCodePlaceholder")} />
              {lsErrors.code && <p className="text-xs text-destructive mt-1">{lsErrors.code}</p>}
            </div>
            <div>
              <Label htmlFor="ls-desc">{t("dialogs.descLabel")}</Label>
              <Input id="ls-desc" value={lsDesc} onChange={(e) => setLsDesc(e.target.value)} placeholder={t("dialogs.lsDescPlaceholder")} />
              {lsErrors.description && <p className="text-xs text-destructive mt-1">{lsErrors.description}</p>}
            </div>
          </div>
          <DialogFooter>
            <AddAnotherToggle id="line-service-add-another" checked={addAnother} onCheckedChange={setAddAnother} />
            <Button variant="outline" onClick={() => { setIsAddLineServiceOpen(false); setLsCode(""); setLsDesc(""); setLsErrors({}) }}>{t("dialogs.cancel")}</Button>
            <Button onClick={handleAddLineService} loading={isSubmittingLineService}>{t("dialogs.create")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddUnitTimeOpen} onOpenChange={(open) => { if (!open) { setIsAddUnitTimeOpen(false); setUnitTimeUt(""); setUnitTimeStandard(""); setUnitTimeErrors({}) } }}>
        <DialogContent>
          <form onSubmit={handleAddUnitTimeReference}>
            <DialogHeader>
              <DialogTitle>{t("dialogs.addFlangeUnitTimeTitle")}</DialogTitle>
              <DialogDescription>{t("dialogs.addFlangeUnitTimeDesc")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-3">
              <div>
                <Label htmlFor="unit-time-activity">{t("dialogs.activityLabel")}</Label>
                <Input id="unit-time-activity" value={FLANGE_JOINTING_ACTIVITY} readOnly />
              </div>
              <div>
                <Label htmlFor="unit-time-ut">{t("dialogs.projectUtLabel")}</Label>
                <Input id="unit-time-ut" type="number" step="0.001" value={unitTimeUt} onChange={(e) => setUnitTimeUt(e.target.value)} disabled={isSubmittingUnitTime} />
                {unitTimeErrors.projectUt && <p className="mt-1 text-xs text-destructive">{unitTimeErrors.projectUt}</p>}
              </div>
              <div>
                <Label htmlFor="unit-time-standard">{t("dialogs.standardReferenceLabel")}</Label>
                <Input id="unit-time-standard" value={unitTimeStandard} onChange={(e) => setUnitTimeStandard(e.target.value)} disabled={isSubmittingUnitTime} />
                {unitTimeErrors.standardReference && <p className="mt-1 text-xs text-destructive">{unitTimeErrors.standardReference}</p>}
              </div>
            </div>
            <DialogFooter>
              <AddAnotherToggle id="flange-unit-time-add-another" checked={addAnother} onCheckedChange={setAddAnother} />
              <Button type="button" variant="outline" onClick={() => setIsAddUnitTimeOpen(false)} disabled={isSubmittingUnitTime}>{t("dialogs.cancel")}</Button>
              <Button type="submit" loading={isSubmittingUnitTime}>{t("dialogs.create")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddPunchCodeOpen} onOpenChange={(open) => { if (!open) { setIsAddPunchCodeOpen(false); setPunchCode(""); setPunchDescription(""); setPunchErrors({}) } }}>
        <DialogContent>
          <form onSubmit={handleAddPunchCode}>
            <DialogHeader>
              <DialogTitle>{t("dialogs.addPunchCodeTitle")}</DialogTitle>
              <DialogDescription>{t("dialogs.addPunchCodeDesc")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-3">
              <div>
                <Label htmlFor="punch-code">{t("dialogs.codeLabel")}</Label>
                <Input id="punch-code" value={punchCode} onChange={(e) => setPunchCode(e.target.value)} disabled={isSubmittingPunchCode} />
                {punchErrors.code && <p className="mt-1 text-xs text-destructive">{punchErrors.code}</p>}
              </div>
              <div>
                <Label htmlFor="punch-description">{t("dialogs.descLabel")}</Label>
                <Input id="punch-description" value={punchDescription} onChange={(e) => setPunchDescription(e.target.value)} disabled={isSubmittingPunchCode} />
                {punchErrors.description && <p className="mt-1 text-xs text-destructive">{punchErrors.description}</p>}
              </div>
            </div>
            <DialogFooter>
              <AddAnotherToggle id="punch-code-add-another" checked={addAnother} onCheckedChange={setAddAnother} />
              <Button type="button" variant="outline" onClick={() => setIsAddPunchCodeOpen(false)} disabled={isSubmittingPunchCode}>{t("dialogs.cancel")}</Button>
              <Button type="submit" loading={isSubmittingPunchCode}>{t("dialogs.create")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
