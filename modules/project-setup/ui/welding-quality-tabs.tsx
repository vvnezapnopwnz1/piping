"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { AlertCircle, AlertTriangle, CheckCircle2, Plus, RefreshCw, Search } from "lucide-react"
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
import { Checkbox } from "@/components/ui/checkbox"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import {
  loadWeldingQualityReferences,
  createServiceClass,
  createWeldType,
  saveWelderQualificationRpc,
  createNdeMatrixRule,
  createThicknessFlangeRule,
  createPipingMaterialRecord,
  createReworkCode,
  createJointCategory,
  type LoadedWeldingQualityReferences,
} from "../infrastructure/supabase-welding-quality-reference-repository"
import {
  validateServiceClassInput,
  validateWeldTypeInput,
  validateWelderQualificationInput,
  validateNdeMatrixRuleInput,
  validateThicknessFlangeRuleInput,
  validatePipingMaterialRecordInput,
  validateReworkCodeInput,
  validateJointCategoryInput,
  evaluateNdeMatrixCoverage,
} from "../domain/welding-quality-reference"
import { ReferenceStatusBadge } from "./reference-status-badge"

export function WeldingQualityTabs({
  projectId,
  canManage,
}: {
  projectId: string
  canManage: boolean
}) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<LoadedWeldingQualityReferences | null>(null)
  const [activeTab, setActiveTab] = useState<
    "service-classes" | "weld-types" | "welders" | "nde" | "thickness" | "pml" | "rework" | "joint-categories"
  >("service-classes")

  // Search filter
  const [search, setSearch] = useState("")

  // Add Service Class Dialog
  const [isAddScOpen, setIsAddScOpen] = useState(false)
  const [scCode, setScCode] = useState("")
  const [scDesc, setScDesc] = useState("")
  const [scMatTypeId, setScMatTypeId] = useState("")
  const [scErrors, setScErrors] = useState<Record<string, string>>({})
  const [isSubmittingSc, setIsSubmittingSc] = useState(false)

  // Add Weld Type Dialog
  const [isAddWtOpen, setIsAddWtOpen] = useState(false)
  const [wtCode, setWtCode] = useState("")
  const [wtDesc, setWtDesc] = useState("")
  const [wtCountsDia, setWtCountsDia] = useState(true)
  const [wtErrors, setWtErrors] = useState<Record<string, string>>({})
  const [isSubmittingWt, setIsSubmittingWt] = useState(false)

  // Add NDE Matrix Rule Dialog
  const [isAddNdeOpen, setIsAddNdeOpen] = useState(false)
  const [ndeScId, setNdeScId] = useState("")
  const [ndeWtId, setNdeWtId] = useState("")
  const [ndeLoc, setNdeLoc] = useState<"shop" | "assembly" | "field">("shop")
  const [ndeRt, setNdeRt] = useState("100")
  const [ndeUt, setNdeUt] = useState("0")
  const [ndeMt, setNdeMt] = useState("0")
  const [ndePt, setNdePt] = useState("0")
  const [ndePmi, setNdePmi] = useState("0")
  const [ndeHt, setNdeHt] = useState("0")
  const [ndePwhtReq, setNdePwhtReq] = useState(false)
  const [ndePwhtThick, setNdePwhtThick] = useState("")
  const [ndeTraceReq, setNdeTraceReq] = useState(true)
  const [ndeErrors, setNdeErrors] = useState<Record<string, string>>({})
  const [isSubmittingNde, setIsSubmittingNde] = useState(false)

  // Add PML Dialog
  const [isAddPmlOpen, setIsAddPmlOpen] = useState(false)
  const [pmlMrr, setPmlMrr] = useState("")
  const [pmlIdent, setPmlIdent] = useState("")
  const [pmlTrace, setPmlTrace] = useState("")
  const [pmlErrors, setPmlErrors] = useState<Record<string, string>>({})
  const [isSubmittingPml, setIsSubmittingPml] = useState(false)

  const requestVersionRef = useRef(0)

  const fetchReferences = useCallback(async () => {
    const currentVersion = ++requestVersionRef.current
    setLoading(true)
    setError(null)

    try {
      const client = getSupabaseBrowserClient()
      const result = await loadWeldingQualityReferences(client, projectId)

      if (currentVersion === requestVersionRef.current) {
        setData(result)
        setLoading(false)
      }
    } catch (err: any) {
      if (currentVersion === requestVersionRef.current) {
        setError(err.message || "Failed to load welding quality references")
        setLoading(false)
      }
    }
  }, [projectId])

  useEffect(() => {
    fetchReferences()
  }, [fetchReferences])

  const handleCreateServiceClass = async (e: React.FormEvent) => {
    e.preventDefault()
    const validation = validateServiceClassInput({
      code: scCode,
      description: scDesc || null,
      materialTypeId: scMatTypeId,
    })

    if (!validation.ok) {
      setScErrors(validation.errors)
      return
    }

    setScErrors({})
    setIsSubmittingSc(true)

    try {
      const client = getSupabaseBrowserClient()
      const newSc = await createServiceClass(client, projectId, validation.value)
      setData((prev) =>
        prev
          ? {
              ...prev,
              serviceClasses: [...prev.serviceClasses, newSc].sort((a, b) => a.code.localeCompare(b.code)),
            }
          : null
      )
      setIsAddScOpen(false)
      setScCode("")
      setScDesc("")
      setScMatTypeId("")
      toast.success(`Service class "${newSc.code}" created successfully`)
    } catch (err: any) {
      toast.error(err.message || "Failed to create service class")
    } finally {
      setIsSubmittingSc(false)
    }
  }

  const handleCreateWeldType = async (e: React.FormEvent) => {
    e.preventDefault()
    const validation = validateWeldTypeInput({
      code: wtCode,
      description: wtDesc,
      countsInDiaInch: wtCountsDia,
    })

    if (!validation.ok) {
      setWtErrors(validation.errors)
      return
    }

    setWtErrors({})
    setIsSubmittingWt(true)

    try {
      const client = getSupabaseBrowserClient()
      const newWt = await createWeldType(client, projectId, validation.value)
      setData((prev) =>
        prev
          ? {
              ...prev,
              weldTypes: [...prev.weldTypes, newWt].sort((a, b) => a.code.localeCompare(b.code)),
            }
          : null
      )
      setIsAddWtOpen(false)
      setWtCode("")
      setWtDesc("")
      toast.success(`Weld type "${newWt.code}" created successfully`)
    } catch (err: any) {
      toast.error(err.message || "Failed to create weld type")
    } finally {
      setIsSubmittingWt(false)
    }
  }

  const handleCreateNdeRule = async (e: React.FormEvent) => {
    e.preventDefault()
    const validation = validateNdeMatrixRuleInput({
      serviceClassId: ndeScId,
      weldTypeId: ndeWtId,
      weldLocation: ndeLoc,
      rtCoverage: parseFloat(ndeRt) || 0,
      utCoverage: parseFloat(ndeUt) || 0,
      mtCoverage: parseFloat(ndeMt) || 0,
      ptCoverage: parseFloat(ndePt) || 0,
      pmiCoverage: parseFloat(ndePmi) || 0,
      htCoverage: parseFloat(ndeHt) || 0,
      pwhtRequired: ndePwhtReq,
      pwhtThicknessThreshold: ndePwhtThick ? parseFloat(ndePwhtThick) : null,
      materialTraceabilityRequired: ndeTraceReq,
    })

    if (!validation.ok) {
      setNdeErrors(validation.errors)
      return
    }

    setNdeErrors({})
    setIsSubmittingNde(true)

    try {
      const client = getSupabaseBrowserClient()
      const newRule = await createNdeMatrixRule(client, projectId, validation.value)
      setData((prev) =>
        prev
          ? {
              ...prev,
              ndeMatrixRules: [...prev.ndeMatrixRules, newRule],
            }
          : null
      )
      setIsAddNdeOpen(false)
      toast.success("NDE matrix rule created successfully")
    } catch (err: any) {
      toast.error(err.message || "Failed to create NDE matrix rule")
    } finally {
      setIsSubmittingNde(false)
    }
  }

  const handleCreatePml = async (e: React.FormEvent) => {
    e.preventDefault()
    const validation = validatePipingMaterialRecordInput({
      mrrNumber: pmlMrr,
      identCode: pmlIdent,
      traceNumber: pmlTrace,
    })

    if (!validation.ok) {
      setPmlErrors(validation.errors)
      return
    }

    setPmlErrors({})
    setIsSubmittingPml(true)

    try {
      const client = getSupabaseBrowserClient()
      const newRecord = await createPipingMaterialRecord(client, projectId, validation.value)
      setData((prev) =>
        prev
          ? {
              ...prev,
              pipingMaterialRecords: [...prev.pipingMaterialRecords, newRecord],
            }
          : null
      )
      setIsAddPmlOpen(false)
      setPmlMrr("")
      setPmlIdent("")
      setPmlTrace("")
      toast.success("Piping material record added successfully")
    } catch (err: any) {
      toast.error(err.message || "Failed to add piping material record")
    } finally {
      setIsSubmittingPml(false)
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
          <Button variant="outline" className="mt-4" onClick={fetchReferences}>
            <RefreshCw className="mr-2 h-4 w-4" /> Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  const activeServiceClasses = (data?.serviceClasses ?? []).filter((sc) => sc.status === "active")
  const activeWeldTypes = (data?.weldTypes ?? []).filter((wt) => wt.status === "active")
  const activeNdeRules = (data?.ndeMatrixRules ?? []).filter((r) => r.status === "active")

  const ndeCoverage = evaluateNdeMatrixCoverage(
    activeServiceClasses.map((sc) => sc.id),
    activeWeldTypes.map((wt) => wt.id),
    false,
    activeNdeRules.map((r) => ({
      serviceClassId: r.serviceClassId,
      weldTypeId: r.weldTypeId,
      weldLocation: r.weldLocation,
    }))
  )

  return (
    <div className="space-y-4">
      {/* Sub-tabs header */}
      <div className="flex border-b text-sm font-medium gap-4 overflow-x-auto">
        <button
          className={`pb-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "service-classes"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("service-classes")}
        >
          Service Classes ({data?.serviceClasses.length ?? 0})
        </button>
        <button
          className={`pb-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "weld-types"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("weld-types")}
        >
          Weld Types ({data?.weldTypes.length ?? 0})
        </button>
        <button
          className={`pb-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "welders"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("welders")}
        >
          Welders ({data?.welderQualifications.length ?? 0})
        </button>
        <button
          className={`pb-2 border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === "nde"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("nde")}
        >
          <span>NDE Matrix ({data?.ndeMatrixRules.length ?? 0})</span>
          {ndeCoverage.missingTuples.length > 0 ? (
            <Badge variant="outline" className="text-xs text-amber-600 border-amber-500/30">
              Incomplete ({ndeCoverage.missingTuples.length})
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-500/30">
              Complete
            </Badge>
          )}
        </button>
        <button
          className={`pb-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "thickness"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("thickness")}
        >
          Thickness / Flange ({data?.thicknessFlangeRules.length ?? 0})
        </button>
        <button
          className={`pb-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "pml"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("pml")}
        >
          PML Records ({data?.pipingMaterialRecords.length ?? 0})
        </button>
        <button
          className={`pb-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "rework"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("rework")}
        >
          Rework Codes ({data?.reworkCodes.length ?? 0})
        </button>
        <button
          className={`pb-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "joint-categories"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("joint-categories")}
        >
          Joint Categories ({data?.jointCategories.length ?? 0})
        </button>
      </div>

      {/* Service Classes View */}
      {activeTab === "service-classes" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle>Service Classes</CardTitle>
              <CardDescription>Piping service class specifications linked to material types.</CardDescription>
            </div>
            {canManage && (
              <Button size="sm" onClick={() => setIsAddScOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Add Service Class
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b text-left">
                  <tr>
                    <th className="p-3 font-medium">Class Code</th>
                    <th className="p-3 font-medium">Description</th>
                    <th className="p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(data?.serviceClasses ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-4 text-center text-muted-foreground">
                        No service classes defined.
                      </td>
                    </tr>
                  ) : (
                    (data?.serviceClasses ?? []).map((sc) => (
                      <tr key={sc.id}>
                        <td className="p-3 font-mono font-medium">{sc.code}</td>
                        <td className="p-3">{sc.description || "—"}</td>
                        <td className="p-3">
                          <ReferenceStatusBadge status={sc.status} />
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

      {/* Weld Types View */}
      {activeTab === "weld-types" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle>Weld Types</CardTitle>
              <CardDescription>Canonical weld classifications and diameter-inch accounting flags.</CardDescription>
            </div>
            {canManage && (
              <Button size="sm" onClick={() => setIsAddWtOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Add Weld Type
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b text-left">
                  <tr>
                    <th className="p-3 font-medium">Weld Code</th>
                    <th className="p-3 font-medium">Description</th>
                    <th className="p-3 font-medium">Counts in Dia-Inch</th>
                    <th className="p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(data?.weldTypes ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-muted-foreground">
                        No weld types defined.
                      </td>
                    </tr>
                  ) : (
                    (data?.weldTypes ?? []).map((wt) => (
                      <tr key={wt.id}>
                        <td className="p-3 font-mono font-medium">{wt.code}</td>
                        <td className="p-3">{wt.description}</td>
                        <td className="p-3">
                          {wt.countsInDiaInch ? (
                            <Badge variant="outline" className="text-emerald-600 border-emerald-500/30">Yes</Badge>
                          ) : (
                            <Badge variant="secondary">No</Badge>
                          )}
                        </td>
                        <td className="p-3">
                          <ReferenceStatusBadge status={wt.status} />
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

      {/* Welders View */}
      {activeTab === "welders" && (
        <Card>
          <CardHeader>
            <CardTitle>Welder Qualifications</CardTitle>
            <CardDescription>Welder registry with certificate validity and approved WPS links.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b text-left">
                  <tr>
                    <th className="p-3 font-medium">Welder Stencil</th>
                    <th className="p-3 font-medium">Full Name</th>
                    <th className="p-3 font-medium">Subcontractor</th>
                    <th className="p-3 font-medium">Certificate</th>
                    <th className="p-3 font-medium">Expires On</th>
                    <th className="p-3 font-medium">Qualified</th>
                    <th className="p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(data?.welderQualifications ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-4 text-center text-muted-foreground">
                        No welder qualifications defined.
                      </td>
                    </tr>
                  ) : (
                    (data?.welderQualifications ?? []).map((w) => (
                      <tr key={w.id}>
                        <td className="p-3 font-mono font-medium">{w.welderCode}</td>
                        <td className="p-3">{w.fullName}</td>
                        <td className="p-3 font-mono">{w.subcontractorCode || "—"}</td>
                        <td className="p-3 font-mono">{w.certificateNumber || "—"}</td>
                        <td className="p-3 font-mono">{w.expiresOn}</td>
                        <td className="p-3">
                          {w.isCurrentlyQualified ? (
                            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">Valid</Badge>
                          ) : (
                            <Badge variant="destructive">Expired</Badge>
                          )}
                        </td>
                        <td className="p-3">
                          <ReferenceStatusBadge status={w.status} />
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

      {/* NDE Matrix View */}
      {activeTab === "nde" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle>NDE Matrix Rules</CardTitle>
              <CardDescription>NDE testing percentage requirements by Service Class, Weld Type & Location.</CardDescription>
            </div>
            {canManage && (
              <Button size="sm" onClick={() => setIsAddNdeOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Add NDE Rule
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {ndeCoverage.missingTuples.length > 0 && (
              <div className="flex items-center gap-2 rounded-md bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400 border border-amber-500/20">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>
                  Missing NDE coverage for {ndeCoverage.missingTuples.length} combinations of active Service Classes and Weld Types.
                </span>
              </div>
            )}
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b text-left">
                  <tr>
                    <th className="p-3 font-medium">Service Class</th>
                    <th className="p-3 font-medium">Weld Type</th>
                    <th className="p-3 font-medium">Location</th>
                    <th className="p-3 font-medium">RT%</th>
                    <th className="p-3 font-medium">UT%</th>
                    <th className="p-3 font-medium">MT%</th>
                    <th className="p-3 font-medium">PT%</th>
                    <th className="p-3 font-medium">PMI%</th>
                    <th className="p-3 font-medium">PWHT Req.</th>
                    <th className="p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(data?.ndeMatrixRules ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-4 text-center text-muted-foreground">
                        No NDE matrix rules configured.
                      </td>
                    </tr>
                  ) : (
                    (data?.ndeMatrixRules ?? []).map((nde) => (
                      <tr key={nde.id}>
                        <td className="p-3 font-mono font-medium">{nde.serviceClassCode || "—"}</td>
                        <td className="p-3 font-mono">{nde.weldTypeCode || "—"}</td>
                        <td className="p-3 capitalize">{nde.weldLocation}</td>
                        <td className="p-3 font-mono">{nde.rtCoverage}%</td>
                        <td className="p-3 font-mono">{nde.utCoverage}%</td>
                        <td className="p-3 font-mono">{nde.mtCoverage}%</td>
                        <td className="p-3 font-mono">{nde.ptCoverage}%</td>
                        <td className="p-3 font-mono">{nde.pmiCoverage}%</td>
                        <td className="p-3 font-mono">
                          {nde.pwhtRequired
                            ? nde.pwhtThicknessThreshold
                              ? `> ${nde.pwhtThicknessThreshold}mm`
                              : "Always"
                            : "No"}
                        </td>
                        <td className="p-3">
                          <ReferenceStatusBadge status={nde.status} />
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

      {/* Thickness / Flange Rules View */}
      {activeTab === "thickness" && (
        <Card>
          <CardHeader>
            <CardTitle>Thickness / Flange Rules</CardTitle>
            <CardDescription>Piping thickness thresholds and required flange ratings per Service Class.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b text-left">
                  <tr>
                    <th className="p-3 font-medium">Service Class</th>
                    <th className="p-3 font-medium">Diameter (in)</th>
                    <th className="p-3 font-medium">Thickness (mm)</th>
                    <th className="p-3 font-medium">Flange Rating</th>
                    <th className="p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(data?.thicknessFlangeRules ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-muted-foreground">
                        No thickness flange rules defined.
                      </td>
                    </tr>
                  ) : (
                    (data?.thicknessFlangeRules ?? []).map((rule) => (
                      <tr key={rule.id}>
                        <td className="p-3 font-mono font-medium">{rule.serviceClassCode || "—"}</td>
                        <td className="p-3 font-mono">{rule.diameterInch}"</td>
                        <td className="p-3 font-mono">{rule.thicknessMm} mm</td>
                        <td className="p-3 font-mono">{rule.flangeRating}</td>
                        <td className="p-3">
                          <ReferenceStatusBadge status={rule.status} />
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

      {/* PML Records View */}
      {activeTab === "pml" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle>Piping Material List (PML)</CardTitle>
              <CardDescription>Material Receiving Reports, Ident Codes, and Trace/Heat numbers.</CardDescription>
            </div>
            {canManage && (
              <Button size="sm" onClick={() => setIsAddPmlOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Add PML Record
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b text-left">
                  <tr>
                    <th className="p-3 font-medium">MRR Number</th>
                    <th className="p-3 font-medium">Ident Code</th>
                    <th className="p-3 font-medium">Trace / Heat Number</th>
                    <th className="p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(data?.pipingMaterialRecords ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-muted-foreground">
                        No piping material records defined.
                      </td>
                    </tr>
                  ) : (
                    (data?.pipingMaterialRecords ?? []).map((pml) => (
                      <tr key={pml.id}>
                        <td className="p-3 font-mono font-medium">{pml.mrrNumber}</td>
                        <td className="p-3 font-mono">{pml.identCode}</td>
                        <td className="p-3 font-mono">{pml.traceNumber}</td>
                        <td className="p-3">
                          <ReferenceStatusBadge status={pml.status} />
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

      {/* Rework Codes View */}
      {activeTab === "rework" && (
        <Card>
          <CardHeader>
            <CardTitle>Rework Codes</CardTitle>
            <CardDescription>Defect and repair categorization codes for NDE failures.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b text-left">
                  <tr>
                    <th className="p-3 font-medium">Code</th>
                    <th className="p-3 font-medium">Description</th>
                    <th className="p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(data?.reworkCodes ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-4 text-center text-muted-foreground">
                        No rework codes defined.
                      </td>
                    </tr>
                  ) : (
                    (data?.reworkCodes ?? []).map((rw) => (
                      <tr key={rw.id}>
                        <td className="p-3 font-mono font-medium">{rw.code}</td>
                        <td className="p-3">{rw.description}</td>
                        <td className="p-3">
                          <ReferenceStatusBadge status={rw.status} />
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

      {/* Joint Categories View */}
      {activeTab === "joint-categories" && (
        <Card>
          <CardHeader>
            <CardTitle>Joint Categories</CardTitle>
            <CardDescription>Joint definitions, testing timing, category codes and coefficients.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b text-left">
                  <tr>
                    <th className="p-3 font-medium">Joint Definition</th>
                    <th className="p-3 font-medium">Timing</th>
                    <th className="p-3 font-medium">Category Code</th>
                    <th className="p-3 font-medium">Reason</th>
                    <th className="p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(data?.jointCategories ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-muted-foreground">
                        No joint categories defined.
                      </td>
                    </tr>
                  ) : (
                    (data?.jointCategories ?? []).map((jc) => (
                      <tr key={jc.id}>
                        <td className="p-3 font-medium">{jc.jointDefinition}</td>
                        <td className="p-3 text-muted-foreground">{jc.timing}</td>
                        <td className="p-3 font-mono">{jc.categoryCode}</td>
                        <td className="p-3">{jc.reason}</td>
                        <td className="p-3">
                          <ReferenceStatusBadge status={jc.status} />
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

      {/* Add Service Class Dialog */}
      <Dialog open={isAddScOpen} onOpenChange={setIsAddScOpen}>
        <DialogContent>
          <form onSubmit={handleCreateServiceClass}>
            <DialogHeader>
              <DialogTitle>Add Service Class</DialogTitle>
              <DialogDescription>Define a new piping service class linked to a material type.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-3">
              <div className="space-y-1.5">
                <Label htmlFor="sc-code">Class Code</Label>
                <Input
                  id="sc-code"
                  placeholder="e.g. A1"
                  value={scCode}
                  onChange={(e) => setScCode(e.target.value)}
                  disabled={isSubmittingSc}
                />
                {scErrors.code && <p className="text-xs text-destructive">{scErrors.code}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sc-desc">Description (Optional)</Label>
                <Input
                  id="sc-desc"
                  placeholder="e.g. High pressure process steam"
                  value={scDesc}
                  onChange={(e) => setScDesc(e.target.value)}
                  disabled={isSubmittingSc}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Material Type</Label>
                <Select value={scMatTypeId} onValueChange={setScMatTypeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select material type" />
                  </SelectTrigger>
                  <SelectContent>
                    {(data?.materialTypes ?? []).length === 0 ? (
                      <SelectItem value="none" disabled>No active material types</SelectItem>
                    ) : (
                      (data?.materialTypes ?? []).map((mt) => (
                        <SelectItem key={mt.id} value={mt.id}>
                          {mt.code} — {mt.description}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {scErrors.materialTypeId && <p className="text-xs text-destructive">{scErrors.materialTypeId}</p>}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setIsAddScOpen(false)} disabled={isSubmittingSc}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmittingSc}>
                Add Service Class
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Weld Type Dialog */}
      <Dialog open={isAddWtOpen} onOpenChange={setIsAddWtOpen}>
        <DialogContent>
          <form onSubmit={handleCreateWeldType}>
            <DialogHeader>
              <DialogTitle>Add Weld Type</DialogTitle>
              <DialogDescription>Define a canonical weld type.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-3">
              <div className="space-y-1.5">
                <Label htmlFor="wt-code">Weld Code</Label>
                <Input
                  id="wt-code"
                  placeholder="e.g. BW"
                  value={wtCode}
                  onChange={(e) => setWtCode(e.target.value)}
                  disabled={isSubmittingWt}
                />
                {wtErrors.code && <p className="text-xs text-destructive">{wtErrors.code}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="wt-desc">Description</Label>
                <Input
                  id="wt-desc"
                  placeholder="e.g. Butt Weld"
                  value={wtDesc}
                  onChange={(e) => setWtDesc(e.target.value)}
                  disabled={isSubmittingWt}
                />
                {wtErrors.description && <p className="text-xs text-destructive">{wtErrors.description}</p>}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setIsAddWtOpen(false)} disabled={isSubmittingWt}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmittingWt}>
                Add Weld Type
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
