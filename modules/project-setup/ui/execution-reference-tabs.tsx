"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { AlertCircle, Plus, RefreshCw, Search } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import {
  loadExecutionReferences,
  createProjectTeam,
  createProjectSystem,
  createProjectSubsystem,
  createUnitTimeReference,
  createPunchCode,
  setPunchCodeStatus,
  type LoadedExecutionReferences,
} from "../infrastructure/supabase-execution-reference-repository"
import {
  FLANGE_JOINTING_ACTIVITY,
  validateProjectTeamInput,
  validateSubsystemInput,
  validateUnitTimeReferenceInput,
  validatePunchCodeInput,
  type ProjectTeamType,
} from "../domain/execution-reference"
import { validateReferenceIdentity } from "../domain/reference"
import { ReferenceStatusBadge } from "./reference-status-badge"

const TEAM_TYPE_LABELS: Record<ProjectTeamType, string> = {
  line_check: "Line Check",
  blinding: "Blinding",
  finishing: "Finishing",
  reinstatement: "Reinstatement",
  jointer: "Jointer",
}

export function ExecutionReferenceTabs({
  projectId,
  canManage,
}: {
  projectId: string
  canManage: boolean
}) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<LoadedExecutionReferences | null>(null)
  const [activeTab, setActiveTab] = useState<string>("teams")
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

  // Search
  const [teamSearch, setTeamSearch] = useState("")

  const fetchAll = useCallback(async () => {
    const version = ++requestVersionRef.current
    setLoading(true)
    setError(null)
    try {
      const client = getSupabaseBrowserClient()
      const result = await loadExecutionReferences(client, projectId)
      if (version === requestVersionRef.current) setData(result)
    } catch (err: any) {
      if (version === requestVersionRef.current) setError(err.message || "Failed to load execution references")
    } finally {
      if (version === requestVersionRef.current) setLoading(false)
    }
  }, [projectId])

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
      toast.success("Team created")
      setIsAddTeamOpen(false)
      resetTeamForm()
      fetchAll()
    } catch (err: any) {
      toast.error(err.message || "Failed to create team")
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

  // ── System creation ──
  const handleAddSystem = async () => {
    const validation = validateReferenceIdentity({ code: sysCode, description: sysDesc })
    if (!validation.ok) {
      setSysErrors(validation.errors)
      return
    }
    setIsSubmittingSystem(true)
    try {
      const client = getSupabaseBrowserClient()
      await createProjectSystem(client, projectId, { code: sysCode, description: sysDesc })
      toast.success("System created")
      setIsAddSystemOpen(false)
      setSysCode("")
      setSysDesc("")
      setSysErrors({})
      fetchAll()
    } catch (err: any) {
      toast.error(err.message || "Failed to create system")
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
      toast.success("Subsystem created")
      setIsAddSubsystemOpen(false)
      setSubCode("")
      setSubDesc("")
      setSubSystemId("")
      setSubErrors({})
      fetchAll()
    } catch (err: any) {
      toast.error(err.message || "Failed to create subsystem")
    } finally {
      setIsSubmittingSubsystem(false)
    }
  }

  // ── Line Service creation (reuses generic create pattern) ──
  const handleAddLineService = async () => {
    const validation = validateReferenceIdentity({ code: lsCode, description: lsDesc })
    if (!validation.ok) {
      setLsErrors(validation.errors)
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
      toast.success("Line Service created")
      setIsAddLineServiceOpen(false)
      setLsCode("")
      setLsDesc("")
      setLsErrors({})
      fetchAll()
    } catch (err: any) {
      toast.error(err.message || "Failed to create line service")
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
      setIsAddUnitTimeOpen(false)
      toast.success("Flange unit-time reference created")
    } catch (err: any) {
      toast.error(err.message || "Failed to create flange unit-time reference")
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
      setIsAddPunchCodeOpen(false)
      toast.success("Punch code created")
    } catch (err: any) {
      toast.error(err.message || "Failed to create punch code")
    } finally {
      setIsSubmittingPunchCode(false)
    }
  }

  const handleDeactivatePunchCode = async (id: string) => {
    try {
      await setPunchCodeStatus(getSupabaseBrowserClient(), projectId, id, "inactive")
      setData((prev) => prev ? {
        ...prev,
        punchCodes: prev.punchCodes.map((item) => item.id === id ? { ...item, status: "inactive" } : item),
      } : null)
      toast.success("Punch code deactivated")
    } catch (err: any) {
      toast.error(err.message || "Failed to deactivate punch code")
    }
  }

  if (loading) return <Skeleton className="h-64 w-full" />
  if (error || !data) {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <p className="font-medium">{error || "Data unavailable"}</p>
          </div>
          <Button variant="outline" className="mt-4" onClick={fetchAll}>
            <RefreshCw className="mr-2 h-4 w-4" /> Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  const activeSystems = data.systems.filter((s) => s.status === "active")
  const filteredTeams = data.teams.filter((t) =>
    !teamSearch || t.code.toLowerCase().includes(teamSearch.toLowerCase()) || t.description.toLowerCase().includes(teamSearch.toLowerCase())
  )

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="w-full overflow-x-auto whitespace-nowrap">
        <TabsTrigger value="teams">Teams ({data.teams.length})</TabsTrigger>
        <TabsTrigger value="testpack">Test Pack</TabsTrigger>
        <TabsTrigger value="tracking">Tracking</TabsTrigger>
        <TabsTrigger value="pressure">Pressure</TabsTrigger>
      </TabsList>

      {/* ─── Teams ─── */}
      <TabsContent value="teams" className="mt-4 space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Project Teams</CardTitle>
                <CardDescription>Line check, blinding, finishing, reinstatement, and jointer teams.</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" onClick={fetchAll}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
                {canManage && (
                  <Button size="sm" onClick={() => setIsAddTeamOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Add Team
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Filter teams…"
                  value={teamSearch}
                  onChange={(e) => setTeamSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            {filteredTeams.length === 0 ? (
              <p className="text-muted-foreground text-sm py-6 text-center">No teams found.</p>
            ) : (
              <div className="space-y-2">
                {filteredTeams.map((team) => (
                  <div
                    key={team.id}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <code className="text-xs font-mono bg-muted px-2 py-1 rounded">{team.code}</code>
                      <span className="text-sm">{team.description}</span>
                      <Badge variant="outline" className="text-xs">
                        {TEAM_TYPE_LABELS[team.teamType]}
                      </Badge>
                    </div>
                    <ReferenceStatusBadge status={team.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Punch codes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Punch Codes</CardTitle>
              <CardDescription>Codes available when Line Check records Category X items.</CardDescription>
            </div>
            {canManage && (
              <Button size="sm" onClick={() => setIsAddPunchCodeOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Add Punch Code
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {data.punchCodes.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">No punch codes defined.</p>
            ) : (
              <div className="space-y-2">
                {data.punchCodes.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-md border p-3">
                    <div className="flex items-center gap-3">
                      <code className="text-xs font-mono bg-muted px-2 py-1 rounded">{item.code}</code>
                      <span className="text-sm">{item.description}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ReferenceStatusBadge status={item.status} />
                      {canManage && item.status === "active" && (
                        <Button variant="outline" size="sm" onClick={() => void handleDeactivatePunchCode(item.id)}>
                          Deactivate
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* ─── Test Pack: Systems, Subsystems, Line Services ─── */}
      <TabsContent value="testpack" className="mt-4 space-y-4">
        {/* Systems */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Systems</CardTitle>
                <CardDescription>Top-level engineering systems.</CardDescription>
              </div>
              {canManage && (
                <Button size="sm" onClick={() => setIsAddSystemOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Add System
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {data.systems.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">No systems defined.</p>
            ) : (
              <div className="space-y-2">
                {data.systems.map((sys) => (
                  <div key={sys.id} className="flex items-center justify-between rounded-md border p-3">
                    <div className="flex items-center gap-3">
                      <code className="text-xs font-mono bg-muted px-2 py-1 rounded">{sys.code}</code>
                      <span className="text-sm">{sys.description}</span>
                    </div>
                    <ReferenceStatusBadge status={sys.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Subsystems */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Subsystems</CardTitle>
                <CardDescription>Must belong to an active system.</CardDescription>
              </div>
              {canManage && (
                <Button
                  size="sm"
                  disabled={activeSystems.length === 0}
                  onClick={() => {
                    setSubSystemId(activeSystems[0]?.id ?? "")
                    setIsAddSubsystemOpen(true)
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" /> Add Subsystem
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {data.subsystems.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">No subsystems defined.</p>
            ) : (
              <div className="space-y-2">
                {data.subsystems.map((sub) => (
                  <div key={sub.id} className="flex items-center justify-between rounded-md border p-3">
                    <div className="flex items-center gap-3">
                      <code className="text-xs font-mono bg-muted px-2 py-1 rounded">{sub.code}</code>
                      <span className="text-sm">{sub.description}</span>
                      {sub.systemCode && <Badge variant="secondary">{sub.systemCode}</Badge>}
                    </div>
                    <ReferenceStatusBadge status={sub.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Line Services */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Line Services</CardTitle>
                <CardDescription>Line service classifications used in test-pack and painting.</CardDescription>
              </div>
              {canManage && (
                <Button size="sm" onClick={() => setIsAddLineServiceOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Add Line Service
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {data.lineServices.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">No line services defined.</p>
            ) : (
              <div className="space-y-2">
                {data.lineServices.map((ls) => (
                  <div key={ls.id} className="flex items-center justify-between rounded-md border p-3">
                    <div className="flex items-center gap-3">
                      <code className="text-xs font-mono bg-muted px-2 py-1 rounded">{ls.code}</code>
                      <span className="text-sm">{ls.description}</span>
                    </div>
                    <ReferenceStatusBadge status={ls.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Unit of Time References */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Unit of Time References</CardTitle>
              <CardDescription>Project UT quantities used by progress formulas.</CardDescription>
            </div>
            {canManage && (
              <Button size="sm" onClick={() => setIsAddUnitTimeOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Add Flange Unit Time
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {data.unitTimeReferences.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">No unit time references defined.</p>
            ) : (
              <div className="space-y-2">
                {data.unitTimeReferences.map((ut) => (
                  <div key={ut.id} className="flex items-center justify-between rounded-md border p-3">
                    <div className="flex items-center gap-3">
                      <code className="text-xs font-mono bg-muted px-2 py-1 rounded">{ut.activity}</code>
                      <span className="text-sm">UT: {ut.projectUt}</span>
                      <span className="text-xs text-muted-foreground">{ut.standardReference}</span>
                    </div>
                    <ReferenceStatusBadge status={ut.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* ─── Tracking: Location Categories & Locations ─── */}
      <TabsContent value="tracking" className="mt-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Location Categories</CardTitle>
            <CardDescription>High-level location groupings.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.locationCategories.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">No location categories defined.</p>
            ) : (
              <div className="space-y-2">
                {data.locationCategories.map((cat) => (
                  <div key={cat.id} className="flex items-center justify-between rounded-md border p-3">
                    <div className="flex items-center gap-3">
                      <code className="text-xs font-mono bg-muted px-2 py-1 rounded">{cat.code}</code>
                      <span className="text-sm">{cat.description}</span>
                    </div>
                    <ReferenceStatusBadge status={cat.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Locations</CardTitle>
            <CardDescription>Tracking locations with progress column mapping.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.locations.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">No locations defined.</p>
            ) : (
              <div className="space-y-2">
                {data.locations.map((loc) => (
                  <div key={loc.id} className="flex items-center justify-between rounded-md border p-3">
                    <div className="flex items-center gap-3">
                      <code className="text-xs font-mono bg-muted px-2 py-1 rounded">{loc.code}</code>
                      <span className="text-sm">{loc.description}</span>
                      {loc.categoryCode && <Badge variant="secondary">{loc.categoryCode}</Badge>}
                      {loc.mappedProgressColumns.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {loc.mappedProgressColumns.join(", ")}
                        </Badge>
                      )}
                    </div>
                    <ReferenceStatusBadge status={loc.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* ─── Pressure Unit ─── */}
      <TabsContent value="pressure" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Pressure Unit</CardTitle>
            <CardDescription>Project-scoped pressure unit. One per project.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.pressureUnit ? (
              <div className="flex items-center gap-3 p-3 border rounded-md">
                <Badge variant="default">{data.pressureUnit.unit.toUpperCase()}</Badge>
                <span className="text-sm text-muted-foreground">Active for this project</span>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm py-4 text-center">No pressure unit selected.</p>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* ─── Dialogs ─── */}

      {/* Add Team Dialog */}
      <Dialog open={isAddTeamOpen} onOpenChange={(open) => { if (!open) { setIsAddTeamOpen(false); resetTeamForm() } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Project Team</DialogTitle>
            <DialogDescription>Create a new team for this project.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="team-code">Code</Label>
              <Input id="team-code" value={teamCode} onChange={(e) => setTeamCode(e.target.value)} placeholder="e.g. LC-01" />
              {teamErrors.code && <p className="text-xs text-destructive mt-1">{teamErrors.code}</p>}
            </div>
            <div>
              <Label htmlFor="team-desc">Description</Label>
              <Input id="team-desc" value={teamDesc} onChange={(e) => setTeamDesc(e.target.value)} placeholder="Line Check Team Alpha" />
              {teamErrors.description && <p className="text-xs text-destructive mt-1">{teamErrors.description}</p>}
            </div>
            <div>
              <Label htmlFor="team-type">Team Type</Label>
              <Select value={teamType} onValueChange={(v) => setTeamType(v as ProjectTeamType)}>
                <SelectTrigger id="team-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TEAM_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {teamErrors.teamType && <p className="text-xs text-destructive mt-1">{teamErrors.teamType}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsAddTeamOpen(false); resetTeamForm() }}>Cancel</Button>
            <Button onClick={handleAddTeam} disabled={isSubmittingTeam}>{isSubmittingTeam ? "Creating…" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add System Dialog */}
      <Dialog open={isAddSystemOpen} onOpenChange={(open) => { if (!open) { setIsAddSystemOpen(false); setSysCode(""); setSysDesc(""); setSysErrors({}) } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add System</DialogTitle>
            <DialogDescription>Create a top-level engineering system.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="sys-code">Code</Label>
              <Input id="sys-code" value={sysCode} onChange={(e) => setSysCode(e.target.value)} placeholder="e.g. SYS-001" />
              {sysErrors.code && <p className="text-xs text-destructive mt-1">{sysErrors.code}</p>}
            </div>
            <div>
              <Label htmlFor="sys-desc">Description</Label>
              <Input id="sys-desc" value={sysDesc} onChange={(e) => setSysDesc(e.target.value)} placeholder="Fire Water System" />
              {sysErrors.description && <p className="text-xs text-destructive mt-1">{sysErrors.description}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsAddSystemOpen(false); setSysCode(""); setSysDesc(""); setSysErrors({}) }}>Cancel</Button>
            <Button onClick={handleAddSystem} disabled={isSubmittingSystem}>{isSubmittingSystem ? "Creating…" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Subsystem Dialog */}
      <Dialog open={isAddSubsystemOpen} onOpenChange={(open) => { if (!open) { setIsAddSubsystemOpen(false); setSubCode(""); setSubDesc(""); setSubSystemId(""); setSubErrors({}) } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Subsystem</DialogTitle>
            <DialogDescription>Create a subsystem within a parent system.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="sub-system">Parent System</Label>
              <Select value={subSystemId} onValueChange={setSubSystemId}>
                <SelectTrigger id="sub-system"><SelectValue placeholder="Select system" /></SelectTrigger>
                <SelectContent>
                  {activeSystems.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.code} — {s.description}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {subErrors.systemId && <p className="text-xs text-destructive mt-1">{subErrors.systemId}</p>}
            </div>
            <div>
              <Label htmlFor="sub-code">Code</Label>
              <Input id="sub-code" value={subCode} onChange={(e) => setSubCode(e.target.value)} placeholder="e.g. SS-001A" />
              {subErrors.code && <p className="text-xs text-destructive mt-1">{subErrors.code}</p>}
            </div>
            <div>
              <Label htmlFor="sub-desc">Description</Label>
              <Input id="sub-desc" value={subDesc} onChange={(e) => setSubDesc(e.target.value)} placeholder="Sub System Description" />
              {subErrors.description && <p className="text-xs text-destructive mt-1">{subErrors.description}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsAddSubsystemOpen(false) }}>Cancel</Button>
            <Button onClick={handleAddSubsystem} disabled={isSubmittingSubsystem}>{isSubmittingSubsystem ? "Creating…" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Line Service Dialog */}
      <Dialog open={isAddLineServiceOpen} onOpenChange={(open) => { if (!open) { setIsAddLineServiceOpen(false); setLsCode(""); setLsDesc(""); setLsErrors({}) } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Line Service</DialogTitle>
            <DialogDescription>Create a line service classification.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="ls-code">Code</Label>
              <Input id="ls-code" value={lsCode} onChange={(e) => setLsCode(e.target.value)} placeholder="e.g. LS-STEAM" />
              {lsErrors.code && <p className="text-xs text-destructive mt-1">{lsErrors.code}</p>}
            </div>
            <div>
              <Label htmlFor="ls-desc">Description</Label>
              <Input id="ls-desc" value={lsDesc} onChange={(e) => setLsDesc(e.target.value)} placeholder="Process Steam Line" />
              {lsErrors.description && <p className="text-xs text-destructive mt-1">{lsErrors.description}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsAddLineServiceOpen(false); setLsCode(""); setLsDesc(""); setLsErrors({}) }}>Cancel</Button>
            <Button onClick={handleAddLineService} disabled={isSubmittingLineService}>{isSubmittingLineService ? "Creating…" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddUnitTimeOpen} onOpenChange={(open) => { if (!open) { setIsAddUnitTimeOpen(false); setUnitTimeUt(""); setUnitTimeStandard(""); setUnitTimeErrors({}) } }}>
        <DialogContent>
          <form onSubmit={handleAddUnitTimeReference}>
            <DialogHeader>
              <DialogTitle>Add Flange Unit Time</DialogTitle>
              <DialogDescription>Configure the project quantity for FLANGE_JOINTING.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-3">
              <div>
                <Label htmlFor="unit-time-activity">Activity</Label>
                <Input id="unit-time-activity" value={FLANGE_JOINTING_ACTIVITY} readOnly />
              </div>
              <div>
                <Label htmlFor="unit-time-ut">Project UT</Label>
                <Input id="unit-time-ut" type="number" step="0.001" value={unitTimeUt} onChange={(e) => setUnitTimeUt(e.target.value)} disabled={isSubmittingUnitTime} />
                {unitTimeErrors.projectUt && <p className="mt-1 text-xs text-destructive">{unitTimeErrors.projectUt}</p>}
              </div>
              <div>
                <Label htmlFor="unit-time-standard">Standard reference</Label>
                <Input id="unit-time-standard" value={unitTimeStandard} onChange={(e) => setUnitTimeStandard(e.target.value)} disabled={isSubmittingUnitTime} />
                {unitTimeErrors.standardReference && <p className="mt-1 text-xs text-destructive">{unitTimeErrors.standardReference}</p>}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddUnitTimeOpen(false)} disabled={isSubmittingUnitTime}>Cancel</Button>
              <Button type="submit" disabled={isSubmittingUnitTime}>{isSubmittingUnitTime ? "Creating…" : "Create"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddPunchCodeOpen} onOpenChange={(open) => { if (!open) { setIsAddPunchCodeOpen(false); setPunchCode(""); setPunchDescription(""); setPunchErrors({}) } }}>
        <DialogContent>
          <form onSubmit={handleAddPunchCode}>
            <DialogHeader>
              <DialogTitle>Add Punch Code</DialogTitle>
              <DialogDescription>Create a project code for Category X Line Check items.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-3">
              <div>
                <Label htmlFor="punch-code">Code</Label>
                <Input id="punch-code" value={punchCode} onChange={(e) => setPunchCode(e.target.value)} disabled={isSubmittingPunchCode} />
                {punchErrors.code && <p className="mt-1 text-xs text-destructive">{punchErrors.code}</p>}
              </div>
              <div>
                <Label htmlFor="punch-description">Description</Label>
                <Input id="punch-description" value={punchDescription} onChange={(e) => setPunchDescription(e.target.value)} disabled={isSubmittingPunchCode} />
                {punchErrors.description && <p className="mt-1 text-xs text-destructive">{punchErrors.description}</p>}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddPunchCodeOpen(false)} disabled={isSubmittingPunchCode}>Cancel</Button>
              <Button type="submit" disabled={isSubmittingPunchCode}>{isSubmittingPunchCode ? "Creating…" : "Create"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Tabs>
  )
}
