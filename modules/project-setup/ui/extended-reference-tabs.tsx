"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { AlertCircle, Plus, RefreshCw, Settings2 } from "lucide-react"
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
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
} from "../domain/extended-reference"
import { ReferenceStatusBadge } from "./reference-status-badge"

export function ExtendedReferenceTabs({
  projectId,
  canManage,
}: {
  projectId: string
  canManage: boolean
}) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<LoadedExtendedReferences | null>(null)
  const [activeTab, setActiveTab] = useState<string>("spooling")
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
      if (version === requestVersionRef.current) setError(err.message || "Failed to load extended references")
    } finally {
      if (version === requestVersionRef.current) setLoading(false)
    }
  }, [canManage, projectId])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  // ── Device creation ──
  const handleAddDevice = async () => {
    const validation = validateDeviceInput({ code: devCode, description: devDesc })
    if (!validation.ok) {
      setDevErrors(validation.errors)
      return
    }
    setIsSubmittingDevice(true)
    try {
      const client = getSupabaseBrowserClient()
      await createDevice(client, projectId, validation.value)
      toast.success("Device created")
      setIsAddDeviceOpen(false)
      setDevCode("")
      setDevDesc("")
      setDevErrors({})
      fetchAll()
    } catch (err: any) {
      toast.error(err.message || "Failed to create device")
    } finally {
      setIsSubmittingDevice(false)
    }
  }

  const handleAssignDeviceUser = async () => {
    const validation = validateDeviceUserInput({ membershipId: selectedMembershipId, deviceId: selectedDeviceId || null })
    if (!validation.ok) { toast.error(Object.values(validation.errors).join(", ")); return }
    setIsSubmittingDevice(true)
    try {
      await assignDeviceUser(getSupabaseBrowserClient(), projectId, validation.value)
      toast.success("PDA user assigned")
      setSelectedMembershipId("")
      setSelectedDeviceId("")
      await fetchAll()
    } catch (err: any) {
      toast.error(err.message || "Failed to assign PDA user")
    } finally {
      setIsSubmittingDevice(false)
    }
  }

  // ── Assembly settings save ──
  const handleSaveAssembly = async () => {
    const input = { enabled: assemblyEnabled, defaultSubcontractorId: assemblySubId || null }
    const validation = validateAssemblySettingsInput(input)
    if (!validation.ok) {
      toast.error(Object.values(validation.errors).join(", "))
      return
    }
    setIsSavingAssembly(true)
    try {
      const client = getSupabaseBrowserClient()
      await saveAssemblySettings(client, projectId, validation.value.enabled, validation.value.defaultSubcontractorId)
      toast.success("Assembly settings saved")
      fetchAll()
    } catch (err: any) {
      toast.error(err.message || "Failed to save assembly settings")
    } finally {
      setIsSavingAssembly(false)
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

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="w-full overflow-x-auto whitespace-nowrap">
        <TabsTrigger value="spooling">Spooling</TabsTrigger>
        <TabsTrigger value="painting">Painting</TabsTrigger>
        <TabsTrigger value="assembly">Assembly</TabsTrigger>
        <TabsTrigger value="devices">Devices ({data.devices.length})</TabsTrigger>
      </TabsList>

      {/* ─── Spooling ─── */}
      <TabsContent value="spooling" className="mt-4 space-y-4">
        {/* Spooling Material Types */}
        <Card>
          <CardHeader>
            <CardTitle>Spooling Material Types</CardTitle>
            <CardDescription>Project-scoped spooling material definitions.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.spoolingMaterialTypes.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">No spooling material types defined.</p>
            ) : (
              <div className="space-y-2">
                {data.spoolingMaterialTypes.map((mt) => (
                  <div key={mt.id} className="flex items-center justify-between rounded-md border p-3">
                    <div className="flex items-center gap-3">
                      <code className="text-xs font-mono bg-muted px-2 py-1 rounded">{mt.code}</code>
                      <span className="text-sm">{mt.description}</span>
                    </div>
                    <ReferenceStatusBadge status={mt.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Spooling Material Classes */}
        <Card>
          <CardHeader>
            <CardTitle>Spooling Material Classes</CardTitle>
            <CardDescription>External class codes mapped to material types.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.spoolingMaterialClasses.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">No spooling material classes defined.</p>
            ) : (
              <div className="space-y-2">
                {data.spoolingMaterialClasses.map((mc) => (
                  <div key={mc.id} className="flex items-center justify-between rounded-md border p-3">
                    <div className="flex items-center gap-3">
                      <code className="text-xs font-mono bg-muted px-2 py-1 rounded">{mc.externalClassCode}</code>
                      {mc.materialTypeCode && <Badge variant="secondary">{mc.materialTypeCode}</Badge>}
                    </div>
                    <ReferenceStatusBadge status={mc.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Spooling Checklist */}
        <Card>
          <CardHeader>
            <CardTitle>Spooling Checklist</CardTitle>
            <CardDescription>Required and optional checklist items for spooling.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.spoolingChecklistItems.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">No checklist items defined.</p>
            ) : (
              <div className="space-y-2">
                {data.spoolingChecklistItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-md border p-3">
                    <div className="flex items-center gap-3">
                      <code className="text-xs font-mono bg-muted px-2 py-1 rounded">{item.code}</code>
                      <span className="text-sm">{item.description}</span>
                      {item.isRequired && <Badge variant="default">Required</Badge>}
                      <span className="text-xs text-muted-foreground">Order: {item.sortOrder}</span>
                    </div>
                    <ReferenceStatusBadge status={item.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* ─── Painting ─── */}
      <TabsContent value="painting" className="mt-4 space-y-4">
        {/* RAL Codes */}
        <Card>
          <CardHeader>
            <CardTitle>RAL Codes</CardTitle>
            <CardDescription>Color references by line service.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.ralCodes.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">No RAL codes defined.</p>
            ) : (
              <div className="space-y-2">
                {data.ralCodes.map((ral) => (
                  <div key={ral.id} className="flex items-center justify-between rounded-md border p-3">
                    <div className="flex items-center gap-3">
                      <code className="text-xs font-mono bg-muted px-2 py-1 rounded">{ral.ralCode}</code>
                      <span className="text-sm">{ral.colorCode}</span>
                      {ral.lineServiceCode && <Badge variant="secondary">{ral.lineServiceCode}</Badge>}
                    </div>
                    <ReferenceStatusBadge status={ral.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Paint Matrix */}
        <Card>
          <CardHeader>
            <CardTitle>Paint Code Matrix</CardTitle>
            <CardDescription>Blasting, primer, coats and DFT by line service and RAL.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.paintMatrixRules.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">No paint matrix rules defined.</p>
            ) : (
              <div className="space-y-2">
                {data.paintMatrixRules.map((pm) => (
                  <div key={pm.id} className="flex items-center justify-between rounded-md border p-3">
                    <div className="flex items-center gap-3">
                      {pm.lineServiceCode && <Badge variant="secondary">{pm.lineServiceCode}</Badge>}
                      {pm.ralCode && <Badge variant="outline">{pm.ralCode}</Badge>}
                      <span className="text-xs">
                        {pm.blastingRequired ? "Blast" : "No blast"} | {pm.primerRequired ? "Primer" : "No primer"} |
                        {" "}{pm.intermediateCoatCount} int | {pm.finalCoatCount} final | {pm.requiredFinalDftMicrons}µm DFT
                      </span>
                    </div>
                    <ReferenceStatusBadge status={pm.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* ─── Assembly ─── */}
      <TabsContent value="assembly" className="mt-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Settings2 className="h-5 w-5" /> Assembly Configuration
                </CardTitle>
                <CardDescription>
                  Enable or disable assembly for this project. When enabled, a default subcontractor is required.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <Label htmlFor="assembly-toggle" className="text-sm font-medium">Assembly Enabled</Label>
                <Switch
                  id="assembly-toggle"
                  checked={assemblyEnabled}
                  onCheckedChange={setAssemblyEnabled}
                  disabled={!canManage}
                />
              </div>

              {assemblyEnabled && (
                <div>
                  <Label htmlFor="assembly-sub">Default Subcontractor</Label>
                  <Input
                    id="assembly-sub"
                    value={assemblySubId}
                    onChange={(e) => setAssemblySubId(e.target.value)}
                    placeholder="Subcontractor ID"
                    disabled={!canManage}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Must reference an active project subcontractor.
                  </p>
                </div>
              )}

              {canManage && (
                <Button onClick={handleSaveAssembly} disabled={isSavingAssembly}>
                  {isSavingAssembly ? "Saving…" : "Save Assembly Settings"}
                </Button>
              )}

              {!canManage && (
                <p className="text-sm text-muted-foreground">
                  Current state: {data.assemblySettings.enabled ? "Enabled" : "Disabled"}
                  {data.assemblySettings.defaultSubcontractorCode && ` — ${data.assemblySettings.defaultSubcontractorCode}`}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ─── Devices ─── */}
      <TabsContent value="devices" className="mt-4 space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Tracking Devices</CardTitle>
                <CardDescription>PDA and device references for tracking flows.</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" onClick={fetchAll}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
                {canManage && (
                  <Button size="sm" onClick={() => setIsAddDeviceOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Add Device
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {data.devices.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">No devices defined.</p>
            ) : (
              <div className="space-y-2">
                {data.devices.map((dev) => (
                  <div key={dev.id} className="flex items-center justify-between rounded-md border p-3">
                    <div className="flex items-center gap-3">
                      <code className="text-xs font-mono bg-muted px-2 py-1 rounded">{dev.code}</code>
                      <span className="text-sm">{dev.description}</span>
                    </div>
                    <ReferenceStatusBadge status={dev.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Device Users */}
        <Card>
          <CardHeader>
            <CardTitle>PDA Users</CardTitle>
            <CardDescription>Project memberships linked to tracking devices.</CardDescription>
          </CardHeader>
          <CardContent>
            {canManage && (
              <div className="mb-4 grid gap-3 rounded-md border p-3 md:grid-cols-[1fr_1fr_auto]">
                <label className="text-xs text-muted-foreground">Project member<select className="mt-1 h-9 w-full rounded border bg-transparent px-3 text-sm" value={selectedMembershipId} onChange={(event) => setSelectedMembershipId(event.target.value)}><option value="">Select member</option>{deviceUserCandidates.map((candidate) => <option key={candidate.membershipId} value={candidate.membershipId}>{candidate.email ?? candidate.fullName} {candidate.deviceCode ? `— ${candidate.deviceCode}` : ""}</option>)}</select></label>
                <label className="text-xs text-muted-foreground">Tracking device<select className="mt-1 h-9 w-full rounded border bg-transparent px-3 text-sm" value={selectedDeviceId} onChange={(event) => setSelectedDeviceId(event.target.value)}><option value="">Select device</option>{data.devices.filter((device) => device.status === "active").map((device) => <option key={device.id} value={device.id}>{device.code} — {device.description}</option>)}</select></label>
                <Button className="self-end" onClick={handleAssignDeviceUser} disabled={isSubmittingDevice || !selectedMembershipId || !selectedDeviceId}>Assign</Button>
              </div>
            )}
            {(canManage ? deviceUserCandidates.filter((candidate) => candidate.isAssigned) : data.deviceUsers).length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">No PDA users assigned.</p>
            ) : (
              <div className="space-y-2">
                {(canManage ? deviceUserCandidates.filter((candidate) => candidate.isAssigned) : data.deviceUsers).map((du) => (
                  <div key={du.membershipId} className="flex items-center justify-between rounded-md border p-3">
                    <div className="flex items-center gap-3">
                      <span className="text-sm">{"email" in du ? du.email ?? du.fullName : du.userEmail ?? du.membershipId}</span>
                      {du.deviceCode && <Badge variant="secondary">{du.deviceCode}</Badge>}
                    </div>
                    {"status" in du ? <ReferenceStatusBadge status={du.status} /> : <Badge>Active</Badge>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* ─── Add Device Dialog ─── */}
      <Dialog open={isAddDeviceOpen} onOpenChange={(open) => { if (!open) { setIsAddDeviceOpen(false); setDevCode(""); setDevDesc(""); setDevErrors({}) } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Device</DialogTitle>
            <DialogDescription>Register a tracking device for this project.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="dev-code">Code</Label>
              <Input id="dev-code" value={devCode} onChange={(e) => setDevCode(e.target.value)} placeholder="e.g. PDA-001" />
              {devErrors.code && <p className="text-xs text-destructive mt-1">{devErrors.code}</p>}
            </div>
            <div>
              <Label htmlFor="dev-desc">Description</Label>
              <Input id="dev-desc" value={devDesc} onChange={(e) => setDevDesc(e.target.value)} placeholder="Android PDA Unit #1" />
              {devErrors.description && <p className="text-xs text-destructive mt-1">{devErrors.description}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsAddDeviceOpen(false); setDevCode(""); setDevDesc(""); setDevErrors({}) }}>Cancel</Button>
            <Button onClick={handleAddDevice} disabled={isSubmittingDevice}>{isSubmittingDevice ? "Creating…" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Tabs>
  )
}
