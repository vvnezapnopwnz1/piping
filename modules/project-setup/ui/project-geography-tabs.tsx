"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { AlertCircle, Plus, RefreshCw, Search } from "lucide-react"
import { toast } from "sonner"

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
import { Checkbox } from "@/components/ui/checkbox"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import {
  loadProjectGeography,
  createSubcontractor,
  createUnit,
  createAreaClassification,
  createPdsArea,
  type LoadedProjectGeography,
} from "../infrastructure/supabase-project-geography-repository"
import { ReferenceStatusBadge } from "./reference-status-badge"
import {
  validateSubcontractorInput,
  validateUnitInput,
  validateAreaClassificationInput,
  validatePdsAreaInput,
} from "../domain/project-geography"

/**
 * `<SelectItem value="">` makes Radix throw during render — an empty string is reserved for
 * clearing a Select — so an optional reference uses this sentinel and maps it back to null.
 */
const NO_SELECTION = "__none__"

const optionalId = (value: string): string | null =>
  value === "" || value === NO_SELECTION ? null : value

export function ProjectGeographyTabs({
  projectId,
  canManage,
}: {
  projectId: string
  canManage: boolean
}) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [geography, setGeography] = useState<LoadedProjectGeography | null>(null)
  const [activeTab, setActiveTab] = useState<"subcontractors" | "units" | "pds">("subcontractors")

  // Search filters
  const [subSearch, setSubSearch] = useState("")
  const [pdsSearch, setPdsSearch] = useState("")

  // Add Subcontractor Dialog
  const [isAddSubOpen, setIsAddSubOpen] = useState(false)
  const [subCode, setSubCode] = useState("")
  const [subDesc, setSubDesc] = useState("")
  const [subContact, setSubContact] = useState("")
  const [subErrors, setSubErrors] = useState<{ code?: string; description?: string }>({})
  const [isSubmittingSub, setIsSubmittingSub] = useState(false)

  // Add Unit Dialog
  const [isAddUnitOpen, setIsAddUnitOpen] = useState(false)
  const [unitCode, setUnitCode] = useState("")
  const [unitDesc, setUnitDesc] = useState("")
  const [unitErrors, setUnitErrors] = useState<Record<string, string>>({})
  const [isSubmittingUnit, setIsSubmittingUnit] = useState(false)

  // Add Area Classification Dialog
  const [isAddAcOpen, setIsAddAcOpen] = useState(false)
  const [acCode, setAcCode] = useState("")
  const [acDesc, setAcDesc] = useState("")
  const [acUnitId, setAcUnitId] = useState<string>("")
  const [acErrors, setAcErrors] = useState<Record<string, string>>({})
  const [isSubmittingAc, setIsSubmittingAc] = useState(false)

  // Add PDS Area Dialog
  const [isAddPdsOpen, setIsAddPdsOpen] = useState(false)
  const [pdsCode, setPdsCode] = useState("")
  const [pdsDesc, setPdsDesc] = useState("")
  const [shopSubId, setShopSubId] = useState<string>("")
  const [assemblySubId, setAssemblySubId] = useState<string>("")
  const [fieldSubId, setFieldSubId] = useState<string>("")
  const [areaClassId, setAreaClassId] = useState<string>("")
  const [env, setEnv] = useState<"above_ground" | "underground">("above_ground")
  const [isUnitFlag, setIsUnitFlag] = useState(false)
  const [isRackFlag, setIsRackFlag] = useState(false)
  const [pdsCustomValues, setPdsCustomValues] = useState<Record<string, string>>({})
  const [pdsErrors, setPdsErrors] = useState<Record<string, string>>({})
  const [isSubmittingPds, setIsSubmittingPds] = useState(false)

  const requestVersionRef = useRef(0)

  const fetchGeography = useCallback(async () => {
    const currentVersion = ++requestVersionRef.current
    setLoading(true)
    setError(null)

    try {
      const client = getSupabaseBrowserClient()
      const result = await loadProjectGeography(client, projectId)

      if (currentVersion === requestVersionRef.current) {
        setGeography(result)
        setLoading(false)
      }
    } catch (err: any) {
      if (currentVersion === requestVersionRef.current) {
        setError(err.message || "Failed to load project geography")
        setLoading(false)
      }
    }
  }, [projectId])

  useEffect(() => {
    fetchGeography()
  }, [fetchGeography])

  const handleCreateSub = async (e: React.FormEvent) => {
    e.preventDefault()
    const validation = validateSubcontractorInput({
      code: subCode,
      description: subDesc,
      contactDetails: subContact || null,
    })

    if (!validation.ok) {
      setSubErrors(validation.errors)
      return
    }

    setSubErrors({})
    setIsSubmittingSub(true)

    try {
      const client = getSupabaseBrowserClient()
      const newSub = await createSubcontractor(client, projectId, validation.value)
      setGeography((prev) =>
        prev
          ? {
              ...prev,
              subcontractors: [...prev.subcontractors, newSub].sort((a, b) =>
                a.code.localeCompare(b.code)
              ),
            }
          : null
      )
      setIsAddSubOpen(false)
      setSubCode("")
      setSubDesc("")
      setSubContact("")
      toast.success(`Subcontractor "${newSub.code}" added successfully`)
    } catch (err: any) {
      toast.error(err.message || "Failed to add subcontractor")
    } finally {
      setIsSubmittingSub(false)
    }
  }

  const handleCreateUnit = async (e: React.FormEvent) => {
    e.preventDefault()
    const validation = validateUnitInput({ code: unitCode, description: unitDesc })

    if (!validation.ok) {
      setUnitErrors(validation.errors)
      return
    }

    setUnitErrors({})
    setIsSubmittingUnit(true)

    try {
      const client = getSupabaseBrowserClient()
      const newUnit = await createUnit(client, projectId, validation.value)
      setGeography((prev) =>
        prev
          ? {
              ...prev,
              units: [...prev.units, newUnit].sort((a, b) => a.code.localeCompare(b.code)),
            }
          : null
      )
      setIsAddUnitOpen(false)
      setUnitCode("")
      setUnitDesc("")
      toast.success(`Unit "${newUnit.code}" added successfully`)
    } catch (err: any) {
      toast.error(err.message || "Failed to add unit")
    } finally {
      setIsSubmittingUnit(false)
    }
  }

  const handleCreateAreaClassification = async (e: React.FormEvent) => {
    e.preventDefault()
    const validation = validateAreaClassificationInput({
      code: acCode,
      description: acDesc,
      unitId: optionalId(acUnitId),
    })

    if (!validation.ok) {
      setAcErrors(validation.errors)
      return
    }

    setAcErrors({})
    setIsSubmittingAc(true)

    try {
      const client = getSupabaseBrowserClient()
      const newAc = await createAreaClassification(client, projectId, validation.value)
      setGeography((prev) =>
        prev
          ? {
              ...prev,
              areaClassifications: [
                ...prev.areaClassifications,
                {
                  ...newAc,
                  unitCode:
                    newAc.unitCode ??
                    prev.units.find((unit) => unit.id === newAc.unitId)?.code,
                },
              ].sort((a, b) => a.code.localeCompare(b.code)),
            }
          : null
      )
      setIsAddAcOpen(false)
      setAcCode("")
      setAcDesc("")
      setAcUnitId("")
      toast.success(`Area classification "${newAc.code}" added successfully`)
    } catch (err: any) {
      toast.error(err.message || "Failed to add area classification")
    } finally {
      setIsSubmittingAc(false)
    }
  }

  const handleCreatePds = async (e: React.FormEvent) => {
    e.preventDefault()

    const activeCustomKeys = (geography?.customFields ?? [])
      .filter((f) => f.scope === "pds_area" && f.status === "active")
      .map((f) => f.fieldKey)

    const validation = validatePdsAreaInput(
      {
        code: pdsCode,
        description: pdsDesc,
        shopSubcontractorId: optionalId(shopSubId),
        assemblySubcontractorId: optionalId(assemblySubId),
        fieldSubcontractorId: optionalId(fieldSubId),
        areaClassificationId: optionalId(areaClassId),
        environment: env,
        isUnit: isUnitFlag,
        isRack: isRackFlag,
        customValues: pdsCustomValues,
      },
      activeCustomKeys
    )

    if (!validation.ok) {
      setPdsErrors(validation.errors)
      return
    }

    setPdsErrors({})
    setIsSubmittingPds(true)

    try {
      const client = getSupabaseBrowserClient()
      const newPds = await createPdsArea(client, projectId, validation.value)
      setGeography((prev) =>
        prev
          ? {
              ...prev,
              pdsAreas: [...prev.pdsAreas, newPds].sort((a, b) => a.code.localeCompare(b.code)),
            }
          : null
      )
      setIsAddPdsOpen(false)
      setPdsCode("")
      setPdsDesc("")
      setShopSubId("")
      setAssemblySubId("")
      setFieldSubId("")
      setAreaClassId("")
      setEnv("above_ground")
      setIsUnitFlag(false)
      setIsRackFlag(false)
      setPdsCustomValues({})
      toast.success(`PDS Area "${newPds.code}" added successfully`)
    } catch (err: any) {
      toast.error(err.message || "Failed to add PDS area")
    } finally {
      setIsSubmittingPds(false)
    }
  }

  if (loading) return <Skeleton className="h-64 w-full" />

  if (error) {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <p className="font-medium">{error}</p>
          </div>
          <Button variant="outline" className="mt-4" onClick={fetchGeography}>
            <RefreshCw className="mr-2 h-4 w-4" /> Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  const activeSubcontractors = (geography?.subcontractors ?? []).filter((s) => s.status === "active")
  const activeUnits = (geography?.units ?? []).filter((u) => u.status === "active")
  const activePdsCustomFields = (geography?.customFields ?? []).filter(
    (f) => f.scope === "pds_area" && f.status === "active"
  )

  const filteredSubs = (geography?.subcontractors ?? []).filter((s) =>
    subSearch
      ? s.code.toLowerCase().includes(subSearch.toLowerCase()) ||
        s.description.toLowerCase().includes(subSearch.toLowerCase())
      : true
  )

  const filteredPds = (geography?.pdsAreas ?? []).filter((p) =>
    pdsSearch
      ? p.code.toLowerCase().includes(pdsSearch.toLowerCase()) ||
        p.description.toLowerCase().includes(pdsSearch.toLowerCase())
      : true
  )

  return (
    <div className="space-y-4">
      {/* Sub-tabs header */}
      <div className="flex border-b text-sm font-medium gap-4">
        <button
          className={`pb-2 border-b-2 transition-colors ${
            activeTab === "subcontractors"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("subcontractors")}
        >
          Subcontractors ({geography?.subcontractors.length ?? 0})
        </button>
        <button
          className={`pb-2 border-b-2 transition-colors ${
            activeTab === "units"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("units")}
        >
          Units & Area Classifications ({geography?.areaClassifications.length ?? 0})
        </button>
        <button
          className={`pb-2 border-b-2 transition-colors ${
            activeTab === "pds"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("pds")}
        >
          PDS Areas ({geography?.pdsAreas.length ?? 0})
        </button>
      </div>

      {/* Subcontractors View */}
      {activeTab === "subcontractors" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle>Project Subcontractors</CardTitle>
              <CardDescription>Company registry for shop, assembly, and field execution.</CardDescription>
            </div>
            {canManage && (
              <Button size="sm" onClick={() => setIsAddSubOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Add Subcontractor
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative w-72">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search subcontractors..."
                value={subSearch}
                onChange={(e) => setSubSearch(e.target.value)}
                className="pl-8 text-xs h-8"
              />
            </div>
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b text-left">
                  <tr>
                    <th className="p-3 font-medium">Code</th>
                    <th className="p-3 font-medium">Description</th>
                    <th className="p-3 font-medium">Contact Details</th>
                    <th className="p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredSubs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-muted-foreground">
                        No subcontractors found.
                      </td>
                    </tr>
                  ) : (
                    filteredSubs.map((sub) => (
                      <tr key={sub.id}>
                        <td className="p-3 font-mono font-medium">{sub.code}</td>
                        <td className="p-3">{sub.description}</td>
                        <td className="p-3 text-muted-foreground">{sub.contactDetails || "—"}</td>
                        <td className="p-3">
                          <ReferenceStatusBadge status={sub.status} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Units & Area Classifications View */}
      {activeTab === "units" && (
        <div className="space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle>Units</CardTitle>
              <CardDescription>Process units an area classification can belong to.</CardDescription>
            </div>
            {canManage && (
              <Button size="sm" onClick={() => setIsAddUnitOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Add Unit
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b text-left">
                  <tr>
                    <th className="p-3 font-medium">Unit Code</th>
                    <th className="p-3 font-medium">Description</th>
                    <th className="p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(geography?.units ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-4 text-center text-muted-foreground">
                        No units configured.
                      </td>
                    </tr>
                  ) : (
                    (geography?.units ?? []).map((unit) => (
                      <tr key={unit.id}>
                        <td className="p-3 font-mono font-medium">{unit.code}</td>
                        <td className="p-3">{unit.description}</td>
                        <td className="p-3">
                          <ReferenceStatusBadge status={unit.status} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle>Area Classifications</CardTitle>
              <CardDescription>Geographic area breakdown, each one owned by a unit.</CardDescription>
            </div>
            {canManage && (
              <Button
                size="sm"
                onClick={() => setIsAddAcOpen(true)}
                disabled={activeUnits.length === 0}
                title={
                  activeUnits.length === 0
                    ? "Add an active unit first — an area classification must belong to one"
                    : undefined
                }
              >
                <Plus className="mr-2 h-4 w-4" /> Add Area Classification
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b text-left">
                  <tr>
                    <th className="p-3 font-medium">Area Code</th>
                    <th className="p-3 font-medium">Description</th>
                    <th className="p-3 font-medium">Associated Unit</th>
                    <th className="p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(geography?.areaClassifications ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-muted-foreground">
                        No area classifications configured.
                      </td>
                    </tr>
                  ) : (
                    (geography?.areaClassifications ?? []).map((ac) => (
                      <tr key={ac.id}>
                        <td className="p-3 font-mono font-medium">{ac.code}</td>
                        <td className="p-3">{ac.description}</td>
                        <td className="p-3 font-mono text-muted-foreground">{ac.unitCode || "—"}</td>
                        <td className="p-3">
                          <ReferenceStatusBadge status={ac.status} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        </div>
      )}

      {/* PDS Areas View */}
      {activeTab === "pds" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle>PDS Areas</CardTitle>
              <CardDescription>Plant breakdown structure with shop, assembly, and field ownership.</CardDescription>
            </div>
            {canManage && (
              <Button size="sm" onClick={() => setIsAddPdsOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Add PDS Area
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative w-72">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search PDS areas..."
                value={pdsSearch}
                onChange={(e) => setPdsSearch(e.target.value)}
                className="pl-8 text-xs h-8"
              />
            </div>
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b text-left">
                  <tr>
                    <th className="p-3 font-medium">PDS Code</th>
                    <th className="p-3 font-medium">Description</th>
                    <th className="p-3 font-medium">Shop Sub</th>
                    <th className="p-3 font-medium">Assembly Sub</th>
                    <th className="p-3 font-medium">Field Sub</th>
                    <th className="p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredPds.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-muted-foreground">
                        No PDS areas found.
                      </td>
                    </tr>
                  ) : (
                    filteredPds.map((pds) => (
                      <tr key={pds.id}>
                        <td className="p-3 font-mono font-medium">{pds.code}</td>
                        <td className="p-3">{pds.description}</td>
                        <td className="p-3 font-mono">{pds.shopSubcontractorCode || "—"}</td>
                        <td className="p-3 font-mono">{pds.assemblySubcontractorCode || "—"}</td>
                        <td className="p-3 font-mono">{pds.fieldSubcontractorCode || "—"}</td>
                        <td className="p-3">
                          <ReferenceStatusBadge status={pds.status} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Subcontractor Dialog */}
      <Dialog open={isAddSubOpen} onOpenChange={setIsAddSubOpen}>
        <DialogContent>
          <form onSubmit={handleCreateSub}>
            <DialogHeader>
              <DialogTitle>Add Subcontractor</DialogTitle>
              <DialogDescription>Register a new contractor company for this project.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-3">
              <div className="space-y-1.5">
                <Label htmlFor="sub-code">Code</Label>
                <Input
                  id="sub-code"
                  placeholder="e.g. SUB-01"
                  value={subCode}
                  onChange={(e) => setSubCode(e.target.value)}
                  disabled={isSubmittingSub}
                />
                {subErrors.code && <p className="text-xs text-destructive">{subErrors.code}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sub-desc">Description / Company Name</Label>
                <Input
                  id="sub-desc"
                  placeholder="e.g. Quality Piping LLC"
                  value={subDesc}
                  onChange={(e) => setSubDesc(e.target.value)}
                  disabled={isSubmittingSub}
                />
                {subErrors.description && <p className="text-xs text-destructive">{subErrors.description}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sub-contact">Contact Details (Optional)</Label>
                <Input
                  id="sub-contact"
                  placeholder="e.g. info@qpiping.test"
                  value={subContact}
                  onChange={(e) => setSubContact(e.target.value)}
                  disabled={isSubmittingSub}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setIsAddSubOpen(false)} disabled={isSubmittingSub}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmittingSub}>
                Add Subcontractor
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Unit Dialog */}
      <Dialog open={isAddUnitOpen} onOpenChange={setIsAddUnitOpen}>
        <DialogContent>
          <form onSubmit={handleCreateUnit}>
            <DialogHeader>
              <DialogTitle>Add Unit</DialogTitle>
              <DialogDescription>Register a process unit for this project.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-3">
              <div className="space-y-1.5">
                <Label htmlFor="unit-code">Code</Label>
                <Input
                  id="unit-code"
                  placeholder="e.g. U-100"
                  value={unitCode}
                  onChange={(e) => setUnitCode(e.target.value)}
                  disabled={isSubmittingUnit}
                />
                {unitErrors.code && <p className="text-xs text-destructive">{unitErrors.code}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="unit-desc">Description</Label>
                <Input
                  id="unit-desc"
                  placeholder="e.g. Process Unit 100"
                  value={unitDesc}
                  onChange={(e) => setUnitDesc(e.target.value)}
                  disabled={isSubmittingUnit}
                />
                {unitErrors.description && (
                  <p className="text-xs text-destructive">{unitErrors.description}</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                type="button"
                onClick={() => setIsAddUnitOpen(false)}
                disabled={isSubmittingUnit}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmittingUnit}>
                Add Unit
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Area Classification Dialog */}
      <Dialog open={isAddAcOpen} onOpenChange={setIsAddAcOpen}>
        <DialogContent>
          <form onSubmit={handleCreateAreaClassification}>
            <DialogHeader>
              <DialogTitle>Add Area Classification</DialogTitle>
              <DialogDescription>
                Classify an area inside a unit. PDS areas are then filed under this classification.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-3">
              <div className="space-y-1.5">
                <Label htmlFor="ac-code">Code</Label>
                <Input
                  id="ac-code"
                  placeholder="e.g. AC-01"
                  value={acCode}
                  onChange={(e) => setAcCode(e.target.value)}
                  disabled={isSubmittingAc}
                />
                {acErrors.code && <p className="text-xs text-destructive">{acErrors.code}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ac-desc">Description</Label>
                <Input
                  id="ac-desc"
                  placeholder="e.g. Above-ground process area"
                  value={acDesc}
                  onChange={(e) => setAcDesc(e.target.value)}
                  disabled={isSubmittingAc}
                />
                {acErrors.description && (
                  <p className="text-xs text-destructive">{acErrors.description}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Unit</Label>
                <Select value={acUnitId} onValueChange={setAcUnitId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeUnits.map((unit) => (
                      <SelectItem key={unit.id} value={unit.id}>
                        {unit.code} — {unit.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {acErrors.unitId && <p className="text-xs text-destructive">{acErrors.unitId}</p>}
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                type="button"
                onClick={() => setIsAddAcOpen(false)}
                disabled={isSubmittingAc}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmittingAc}>
                Add Area Classification
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add PDS Area Dialog */}
      <Dialog open={isAddPdsOpen} onOpenChange={setIsAddPdsOpen}>
        <DialogContent className="max-w-lg">
          <form onSubmit={handleCreatePds}>
            <DialogHeader>
              <DialogTitle>Add PDS Area</DialogTitle>
              <DialogDescription>Define a PDS area and assign execution subcontractors.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-3 max-h-[60vh] overflow-y-auto pr-1">
              {pdsErrors.subcontractors && (
                <div className="p-2 rounded bg-destructive/10 text-destructive text-xs">
                  {pdsErrors.subcontractors}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="pds-code">Code</Label>
                  <Input
                    id="pds-code"
                    placeholder="e.g. PDS-100"
                    value={pdsCode}
                    onChange={(e) => setPdsCode(e.target.value)}
                    disabled={isSubmittingPds}
                  />
                  {pdsErrors.code && <p className="text-xs text-destructive">{pdsErrors.code}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pds-desc">Description</Label>
                  <Input
                    id="pds-desc"
                    placeholder="e.g. Process Area 100"
                    value={pdsDesc}
                    onChange={(e) => setPdsDesc(e.target.value)}
                    disabled={isSubmittingPds}
                  />
                  {pdsErrors.description && <p className="text-xs text-destructive">{pdsErrors.description}</p>}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Shop Subcontractor</Label>
                <Select value={shopSubId} onValueChange={setShopSubId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select shop subcontractor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_SELECTION}>(None)</SelectItem>
                    {activeSubcontractors.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.code} — {s.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Assembly Subcontractor</Label>
                <Select value={assemblySubId} onValueChange={setAssemblySubId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select assembly subcontractor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_SELECTION}>(None)</SelectItem>
                    {activeSubcontractors.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.code} — {s.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Field Subcontractor</Label>
                <Select value={fieldSubId} onValueChange={setFieldSubId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select field subcontractor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_SELECTION}>(None)</SelectItem>
                    {activeSubcontractors.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.code} — {s.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Area Classification</Label>
                <Select value={areaClassId} onValueChange={setAreaClassId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select area classification" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_SELECTION}>(None)</SelectItem>
                    {(geography?.areaClassifications ?? [])
                      .filter((ac) => ac.status === "active")
                      .map((ac) => (
                        <SelectItem key={ac.id} value={ac.id}>
                          {ac.code} — {ac.description}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Environment, Unit and Rack had no control at all, so every PDS area created here
                  was filed as above-ground, not a unit and not a rack, whatever it was. PDS area
                  is a scoping dimension for access rights, so those defaults were not harmless. */}
              <div className="space-y-1.5">
                <Label>Environment</Label>
                <Select
                  value={env}
                  onValueChange={(value) => setEnv(value as "above_ground" | "underground")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="above_ground">Above ground</SelectItem>
                    <SelectItem value="underground">Underground</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="pds-is-unit"
                    checked={isUnitFlag}
                    onCheckedChange={(checked) => setIsUnitFlag(checked === true)}
                    disabled={isSubmittingPds}
                  />
                  <Label htmlFor="pds-is-unit" className="font-normal">
                    This area is a process unit
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="pds-is-rack"
                    checked={isRackFlag}
                    onCheckedChange={(checked) => setIsRackFlag(checked === true)}
                    disabled={isSubmittingPds}
                  />
                  <Label htmlFor="pds-is-rack" className="font-normal">
                    This area is a pipe rack
                  </Label>
                </div>
              </div>

              {activePdsCustomFields.map((field) => (
                <div key={field.id} className="space-y-1.5">
                  <Label>{field.label}</Label>
                  <Input
                    value={pdsCustomValues[field.fieldKey] ?? ""}
                    onChange={(e) =>
                      setPdsCustomValues((prev) => ({ ...prev, [field.fieldKey]: e.target.value }))
                    }
                    placeholder={`Enter ${field.label}`}
                  />
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setIsAddPdsOpen(false)} disabled={isSubmittingPds}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmittingPds}>
                Add PDS Area
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
