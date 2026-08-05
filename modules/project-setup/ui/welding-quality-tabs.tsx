"use client"

/*
 * Five of this screen's eight sub-tabs can create their referential. That set is not arbitrary:
 * it is exactly what a project needs before any real work can be recorded.
 *
 *   service class + weld type   `apply_spooling_import_job` rejects an unknown code
 *   thickness / flange rule     SRV_THICKNESS_MISSING blocks the SpoolGen import
 *   NDE matrix rule             SRV_NDE_MATRIX_MISSING blocks the import; PQC39 blocks welding
 *   welder qualification        a weld cannot be recorded without a qualified root/cap welder
 *   rework code                 PQC42 refuses a rejected NDE result with no defect code
 *   PML record                  a material check cannot be accepted without matching evidence
 *
 * Joint categories stay read-only: nothing in the schema blocks on them (T02-D2).
 */

import { useCallback, useEffect, useRef, useState } from "react"
import { AlertCircle, AlertTriangle, Plus, RefreshCw } from "lucide-react"
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

  // Add Welder Qualification Dialog
  const [isAddWelderOpen, setIsAddWelderOpen] = useState(false)
  const [welderCode, setWelderCode] = useState("")
  const [welderName, setWelderName] = useState("")
  const [welderSubId, setWelderSubId] = useState("")
  const [welderCert, setWelderCert] = useState("")
  const [welderExpires, setWelderExpires] = useState("")
  const [welderWpsIds, setWelderWpsIds] = useState<string[]>([])
  const [welderErrors, setWelderErrors] = useState<Record<string, string>>({})
  const [isSubmittingWelder, setIsSubmittingWelder] = useState(false)

  // Add Thickness / Flange Rule Dialog
  const [isAddThickOpen, setIsAddThickOpen] = useState(false)
  const [thickScId, setThickScId] = useState("")
  const [thickDia, setThickDia] = useState("")
  const [thickMm, setThickMm] = useState("")
  const [thickRating, setThickRating] = useState("")
  const [thickErrors, setThickErrors] = useState<Record<string, string>>({})
  const [isSubmittingThick, setIsSubmittingThick] = useState(false)

  // Add Rework Code Dialog
  const [isAddReworkOpen, setIsAddReworkOpen] = useState(false)
  const [reworkCode, setReworkCode] = useState("")
  const [reworkDesc, setReworkDesc] = useState("")
  const [reworkErrors, setReworkErrors] = useState<Record<string, string>>({})
  const [isSubmittingRework, setIsSubmittingRework] = useState(false)

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
    } catch (err: unknown) {
      if (currentVersion === requestVersionRef.current) {
        setError(err instanceof Error ? err.message : "Failed to load welding quality references")
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
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create service class")
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
      setWtCountsDia(true)
      toast.success(`Weld type "${newWt.code}" created successfully`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create weld type")
    } finally {
      setIsSubmittingWt(false)
    }
  }

  const handleCreateWelder = async (e: React.FormEvent) => {
    e.preventDefault()
    const validation = validateWelderQualificationInput({
      welderCode,
      fullName: welderName,
      subcontractorId: welderSubId,
      certificateNumber: welderCert || null,
      expiresOn: welderExpires,
      wpsIds: welderWpsIds,
    })

    if (!validation.ok) {
      setWelderErrors(validation.errors)
      return
    }

    setWelderErrors({})
    setIsSubmittingWelder(true)

    try {
      const client = getSupabaseBrowserClient()
      // null welderId means "create"; save_welder_qualification also serves the edit path,
      // which this screen does not offer yet.
      const newWelder = await saveWelderQualificationRpc(client, projectId, null, validation.value)
      setData((prev) =>
        prev
          ? {
              ...prev,
              welderQualifications: [...prev.welderQualifications, newWelder].sort((a, b) =>
                a.welderCode.localeCompare(b.welderCode)
              ),
            }
          : null
      )
      setIsAddWelderOpen(false)
      setWelderCode("")
      setWelderName("")
      setWelderSubId("")
      setWelderCert("")
      setWelderExpires("")
      setWelderWpsIds([])
      toast.success(`Welder "${newWelder.welderCode}" qualified successfully`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save welder qualification")
    } finally {
      setIsSubmittingWelder(false)
    }
  }

  const handleCreateThicknessRule = async (e: React.FormEvent) => {
    e.preventDefault()
    // An empty field parses to NaN rather than 0, so the validator reports it instead of
    // silently recording a zero-diameter rule.
    const validation = validateThicknessFlangeRuleInput({
      serviceClassId: thickScId,
      diameterInch: thickDia === "" ? NaN : Number(thickDia),
      thicknessMm: thickMm === "" ? NaN : Number(thickMm),
      flangeRating: thickRating,
    })

    if (!validation.ok) {
      setThickErrors(validation.errors)
      return
    }

    setThickErrors({})
    setIsSubmittingThick(true)

    try {
      const client = getSupabaseBrowserClient()
      const newRule = await createThicknessFlangeRule(client, projectId, validation.value)
      setData((prev) =>
        prev
          ? {
              ...prev,
              thicknessFlangeRules: [...prev.thicknessFlangeRules, newRule].sort(
                (a, b) => a.diameterInch - b.diameterInch
              ),
            }
          : null
      )
      setIsAddThickOpen(false)
      setThickScId("")
      setThickDia("")
      setThickMm("")
      setThickRating("")
      toast.success("Thickness / flange rule created successfully")
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create thickness rule")
    } finally {
      setIsSubmittingThick(false)
    }
  }

  const handleCreateReworkCode = async (e: React.FormEvent) => {
    e.preventDefault()
    const validation = validateReworkCodeInput({ code: reworkCode, description: reworkDesc })

    if (!validation.ok) {
      setReworkErrors(validation.errors)
      return
    }

    setReworkErrors({})
    setIsSubmittingRework(true)

    try {
      const client = getSupabaseBrowserClient()
      const newCode = await createReworkCode(client, projectId, validation.value)
      setData((prev) =>
        prev
          ? {
              ...prev,
              reworkCodes: [...prev.reworkCodes, newCode].sort((a, b) => a.code.localeCompare(b.code)),
            }
          : null
      )
      setIsAddReworkOpen(false)
      setReworkCode("")
      setReworkDesc("")
      toast.success(`Defect code "${newCode.code}" created successfully`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create defect code")
    } finally {
      setIsSubmittingRework(false)
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
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create NDE matrix rule")
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
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to add piping material record")
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
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle>Welder Qualifications</CardTitle>
              <CardDescription>Welder registry with certificate validity and approved WPS links.</CardDescription>
            </div>
            {canManage && (
              <Button size="sm" onClick={() => setIsAddWelderOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Add Welder
              </Button>
            )}
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
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle>Thickness / Flange Rules</CardTitle>
              <CardDescription>Piping thickness thresholds and required flange ratings per Service Class.</CardDescription>
            </div>
            {canManage && (
              <Button size="sm" onClick={() => setIsAddThickOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Add Thickness Rule
              </Button>
            )}
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
                        <td className="p-3 font-mono">{rule.diameterInch}&quot;</td>
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
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle>Rework Codes</CardTitle>
              <CardDescription>Defect and repair categorization codes for NDE failures.</CardDescription>
            </div>
            {canManage && (
              <Button size="sm" onClick={() => setIsAddReworkOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Add Defect Code
              </Button>
            )}
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
              <div className="flex items-start gap-2">
                <Checkbox
                  id="wt-counts-dia"
                  checked={wtCountsDia}
                  onCheckedChange={(checked) => setWtCountsDia(checked === true)}
                  disabled={isSubmittingWt}
                />
                <div className="space-y-0.5">
                  <Label htmlFor="wt-counts-dia" className="font-normal">
                    Counts towards dia-inch progress
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Clear this for a weld type that is recorded but not earned, such as a support
                    attachment. It cannot be changed once welds exist against the type.
                  </p>
                </div>
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

      {/* Add Welder Qualification Dialog */}
      <Dialog open={isAddWelderOpen} onOpenChange={setIsAddWelderOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <form onSubmit={handleCreateWelder}>
            <DialogHeader>
              <DialogTitle>Add Welder</DialogTitle>
              <DialogDescription>
                Qualify a welder against the procedures they are approved for. A weld cannot be
                recorded without a welder whose certificate is valid on the weld date.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-3">
              <div className="space-y-1.5">
                <Label htmlFor="welder-code">Welder Stencil</Label>
                <Input
                  id="welder-code"
                  placeholder="e.g. W-101"
                  value={welderCode}
                  onChange={(e) => setWelderCode(e.target.value)}
                  disabled={isSubmittingWelder}
                />
                {welderErrors.welderCode && <p className="text-xs text-destructive">{welderErrors.welderCode}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="welder-name">Full Name</Label>
                <Input
                  id="welder-name"
                  placeholder="e.g. Ivan Petrov"
                  value={welderName}
                  onChange={(e) => setWelderName(e.target.value)}
                  disabled={isSubmittingWelder}
                />
                {welderErrors.fullName && <p className="text-xs text-destructive">{welderErrors.fullName}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Subcontractor</Label>
                <Select value={welderSubId} onValueChange={setWelderSubId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select subcontractor" />
                  </SelectTrigger>
                  <SelectContent>
                    {(data?.subcontractors ?? []).length === 0 ? (
                      <SelectItem value="none" disabled>
                        No active subcontractors — add one in Project Geography first
                      </SelectItem>
                    ) : (
                      (data?.subcontractors ?? []).map((sub) => (
                        <SelectItem key={sub.id} value={sub.id}>
                          {sub.code} — {sub.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {welderErrors.subcontractorId && (
                  <p className="text-xs text-destructive">{welderErrors.subcontractorId}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="welder-cert">Certificate Number (Optional)</Label>
                <Input
                  id="welder-cert"
                  placeholder="e.g. CERT-2026-014"
                  value={welderCert}
                  onChange={(e) => setWelderCert(e.target.value)}
                  disabled={isSubmittingWelder}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="welder-expires">Certificate Expires On</Label>
                <Input
                  id="welder-expires"
                  type="date"
                  value={welderExpires}
                  onChange={(e) => setWelderExpires(e.target.value)}
                  disabled={isSubmittingWelder}
                />
                {welderErrors.expiresOn && <p className="text-xs text-destructive">{welderErrors.expiresOn}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Approved WPS</Label>
                {/* A multi-select, not a dropdown: `save_welder_qualification` takes a list, and a
                    welder with no covering WPS is refused by the weld command later. */}
                {(data?.weldingProcedures ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No active welding procedures — add a WPS on this page first.
                  </p>
                ) : (
                  <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border p-3">
                    {(data?.weldingProcedures ?? []).map((wps) => (
                      <div key={wps.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`welder-wps-${wps.id}`}
                          checked={welderWpsIds.includes(wps.id)}
                          onCheckedChange={(checked) =>
                            setWelderWpsIds((current) =>
                              checked === true
                                ? [...current, wps.id]
                                : current.filter((id) => id !== wps.id)
                            )
                          }
                          disabled={isSubmittingWelder}
                        />
                        <Label htmlFor={`welder-wps-${wps.id}`} className="font-mono font-normal">
                          {wps.code}
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
                {welderErrors.wpsIds && <p className="text-xs text-destructive">{welderErrors.wpsIds}</p>}
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                type="button"
                onClick={() => setIsAddWelderOpen(false)}
                disabled={isSubmittingWelder}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmittingWelder}>
                Add Welder
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Thickness / Flange Rule Dialog */}
      <Dialog open={isAddThickOpen} onOpenChange={setIsAddThickOpen}>
        <DialogContent>
          <form onSubmit={handleCreateThicknessRule}>
            <DialogHeader>
              <DialogTitle>Add Thickness / Flange Rule</DialogTitle>
              <DialogDescription>
                One rule per service class and diameter. A SpoolGen import is refused
                (`SRV_THICKNESS_MISSING`) for any weld joint whose class and diameter no active
                rule covers.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-3">
              <div className="space-y-1.5">
                <Label>Service Class</Label>
                <Select value={thickScId} onValueChange={setThickScId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select service class" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeServiceClasses.length === 0 ? (
                      <SelectItem value="none" disabled>No active service classes</SelectItem>
                    ) : (
                      activeServiceClasses.map((sc) => (
                        <SelectItem key={sc.id} value={sc.id}>
                          {sc.code} — {sc.description}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {thickErrors.serviceClassId && (
                  <p className="text-xs text-destructive">{thickErrors.serviceClassId}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="thick-dia">Diameter (inch)</Label>
                  <Input
                    id="thick-dia"
                    type="number"
                    step="0.5"
                    min="0"
                    placeholder="e.g. 6"
                    value={thickDia}
                    onChange={(e) => setThickDia(e.target.value)}
                    disabled={isSubmittingThick}
                  />
                  {thickErrors.diameterInch && (
                    <p className="text-xs text-destructive">{thickErrors.diameterInch}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="thick-mm">Thickness (mm)</Label>
                  <Input
                    id="thick-mm"
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="e.g. 6.0"
                    value={thickMm}
                    onChange={(e) => setThickMm(e.target.value)}
                    disabled={isSubmittingThick}
                  />
                  {thickErrors.thicknessMm && (
                    <p className="text-xs text-destructive">{thickErrors.thicknessMm}</p>
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="thick-rating">Flange Rating</Label>
                <Input
                  id="thick-rating"
                  placeholder="e.g. 150#"
                  value={thickRating}
                  onChange={(e) => setThickRating(e.target.value)}
                  disabled={isSubmittingThick}
                />
                {thickErrors.flangeRating && (
                  <p className="text-xs text-destructive">{thickErrors.flangeRating}</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                type="button"
                onClick={() => setIsAddThickOpen(false)}
                disabled={isSubmittingThick}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmittingThick}>
                Add Rule
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add NDE Matrix Rule Dialog */}
      <Dialog open={isAddNdeOpen} onOpenChange={setIsAddNdeOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <form onSubmit={handleCreateNdeRule}>
            <DialogHeader>
              <DialogTitle>Add NDE Matrix Rule</DialogTitle>
              <DialogDescription>
                Required inspection coverage for one service class, weld type and location. A
                coverage of 100 % is mandatory inspection; anything between 1 and 99 is a spot rate.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-3">
              <div className="space-y-1.5">
                <Label>Service Class</Label>
                <Select value={ndeScId} onValueChange={setNdeScId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select service class" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeServiceClasses.length === 0 ? (
                      <SelectItem value="none" disabled>No active service classes</SelectItem>
                    ) : (
                      activeServiceClasses.map((sc) => (
                        <SelectItem key={sc.id} value={sc.id}>
                          {sc.code} — {sc.description}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {ndeErrors.serviceClassId && (
                  <p className="text-xs text-destructive">{ndeErrors.serviceClassId}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Weld Type</Label>
                <Select value={ndeWtId} onValueChange={setNdeWtId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select weld type" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeWeldTypes.length === 0 ? (
                      <SelectItem value="none" disabled>No active weld types</SelectItem>
                    ) : (
                      activeWeldTypes.map((wt) => (
                        <SelectItem key={wt.id} value={wt.id}>
                          {wt.code} — {wt.description}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {ndeErrors.weldTypeId && <p className="text-xs text-destructive">{ndeErrors.weldTypeId}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Weld Location</Label>
                {/* Assembly is a disabled extension point: `PQC50` refuses an assembly weld, and
                    the coverage check above only expects shop and field, so offering assembly here
                    would invite a rule for work this project can never record. */}
                <Select value={ndeLoc} onValueChange={(value) => setNdeLoc(value as "shop" | "field")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="shop">Shop</SelectItem>
                    <SelectItem value="field">Field</SelectItem>
                  </SelectContent>
                </Select>
                {ndeErrors.weldLocation && <p className="text-xs text-destructive">{ndeErrors.weldLocation}</p>}
              </div>

              <div className="space-y-2">
                <Label>Coverage (%)</Label>
                <div className="grid grid-cols-3 gap-3">
                  {(
                    [
                      ["RT", ndeRt, setNdeRt, "rtCoverage"],
                      ["UT", ndeUt, setNdeUt, "utCoverage"],
                      ["MT", ndeMt, setNdeMt, "mtCoverage"],
                      ["PT", ndePt, setNdePt, "ptCoverage"],
                      ["PMI", ndePmi, setNdePmi, "pmiCoverage"],
                      ["HT", ndeHt, setNdeHt, "htCoverage"],
                    ] as const
                  ).map(([label, value, setValue, errorKey]) => (
                    <div key={label} className="space-y-1">
                      <Label htmlFor={`nde-${label}`} className="text-xs font-normal">
                        {label}
                      </Label>
                      <Input
                        id={`nde-${label}`}
                        type="number"
                        min="0"
                        max="100"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        disabled={isSubmittingNde}
                      />
                      {ndeErrors[errorKey] && <p className="text-xs text-destructive">{ndeErrors[errorKey]}</p>}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="nde-trace-req"
                  checked={ndeTraceReq}
                  onCheckedChange={(checked) => setNdeTraceReq(checked === true)}
                  disabled={isSubmittingNde}
                />
                <Label htmlFor="nde-trace-req" className="font-normal">
                  Material traceability required
                </Label>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="nde-pwht-req"
                    checked={ndePwhtReq}
                    onCheckedChange={(checked) => setNdePwhtReq(checked === true)}
                    disabled={isSubmittingNde}
                  />
                  <Label htmlFor="nde-pwht-req" className="font-normal">
                    PWHT required
                  </Label>
                </div>
                {ndePwhtReq && (
                  <div className="space-y-1.5 pl-6">
                    <Label htmlFor="nde-pwht-thick">Thickness threshold in mm (Optional)</Label>
                    <Input
                      id="nde-pwht-thick"
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="Leave empty to require PWHT at any thickness"
                      value={ndePwhtThick}
                      onChange={(e) => setNdePwhtThick(e.target.value)}
                      disabled={isSubmittingNde}
                    />
                    {ndeErrors.pwhtThicknessThreshold && (
                      <p className="text-xs text-destructive">{ndeErrors.pwhtThicknessThreshold}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                type="button"
                onClick={() => setIsAddNdeOpen(false)}
                disabled={isSubmittingNde}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmittingNde}>
                Add NDE Rule
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add PML Record Dialog */}
      <Dialog open={isAddPmlOpen} onOpenChange={setIsAddPmlOpen}>
        <DialogContent>
          <form onSubmit={handleCreatePml}>
            <DialogHeader>
              <DialogTitle>Add PML Record</DialogTitle>
              <DialogDescription>
                Received material, by ident code and heat number. A material check only accepts a
                trace number that matches a record here.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-3">
              <div className="space-y-1.5">
                <Label htmlFor="pml-mrr">MRR Number</Label>
                <Input
                  id="pml-mrr"
                  placeholder="e.g. MRR-2026-0031"
                  value={pmlMrr}
                  onChange={(e) => setPmlMrr(e.target.value)}
                  disabled={isSubmittingPml}
                />
                {pmlErrors.mrrNumber && <p className="text-xs text-destructive">{pmlErrors.mrrNumber}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pml-ident">Ident Code</Label>
                <Input
                  id="pml-ident"
                  placeholder="e.g. IDN-100"
                  value={pmlIdent}
                  onChange={(e) => setPmlIdent(e.target.value)}
                  disabled={isSubmittingPml}
                />
                {pmlErrors.identCode && <p className="text-xs text-destructive">{pmlErrors.identCode}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pml-trace">Trace / Heat Number</Label>
                <Input
                  id="pml-trace"
                  placeholder="e.g. HEAT-4471"
                  value={pmlTrace}
                  onChange={(e) => setPmlTrace(e.target.value)}
                  disabled={isSubmittingPml}
                />
                {pmlErrors.traceNumber && <p className="text-xs text-destructive">{pmlErrors.traceNumber}</p>}
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                type="button"
                onClick={() => setIsAddPmlOpen(false)}
                disabled={isSubmittingPml}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmittingPml}>
                Add PML Record
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Defect (Rework) Code Dialog */}
      <Dialog open={isAddReworkOpen} onOpenChange={setIsAddReworkOpen}>
        <DialogContent>
          <form onSubmit={handleCreateReworkCode}>
            <DialogHeader>
              <DialogTitle>Add Defect Code</DialogTitle>
              <DialogDescription>
                A rejected NDE result must name a defect code (`PQC42`), so at least one has to
                exist before any rejection can be recorded.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-3">
              <div className="space-y-1.5">
                <Label htmlFor="rework-code">Code</Label>
                <Input
                  id="rework-code"
                  placeholder="e.g. PO"
                  value={reworkCode}
                  onChange={(e) => setReworkCode(e.target.value)}
                  disabled={isSubmittingRework}
                />
                {reworkErrors.code && <p className="text-xs text-destructive">{reworkErrors.code}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rework-desc">Description</Label>
                <Input
                  id="rework-desc"
                  placeholder="e.g. Porosity"
                  value={reworkDesc}
                  onChange={(e) => setReworkDesc(e.target.value)}
                  disabled={isSubmittingRework}
                />
                {reworkErrors.description && (
                  <p className="text-xs text-destructive">{reworkErrors.description}</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                type="button"
                onClick={() => setIsAddReworkOpen(false)}
                disabled={isSubmittingRework}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmittingRework}>
                Add Defect Code
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
