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
 * Joint categories are project-scoped inputs for Track 09 flange progress.
 */

import { useTranslations } from "next-intl"
import { formatFieldErrors } from "./setup-field-issue"

import { useCallback, useEffect, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { AlertCircle, AlertTriangle, Plus, RefreshCw } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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

export type WeldingQualityTab = 
    "service-classes" | "weld-types" | "welders" | "nde" | "thickness" | "pml" | "rework" | "joint-categories"
  

export function WeldingQualityTabs({
  projectId,
  canManage,
  value,
  onValueChange,
}: {
  projectId: string
  canManage: boolean
  value?: WeldingQualityTab
  onValueChange?: (tab: WeldingQualityTab) => void
}) {
  const t = useTranslations("projectSetup.weldingQuality")

  const tIssues = useTranslations("projectSetup.issues")

  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const identFilter = searchParams.get("ident")?.trim() || null

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<LoadedWeldingQualityReferences | null>(null)
  const [internalTab, setInternalTab] = useState<WeldingQualityTab>("service-classes")
  const activeTab = value ?? internalTab

  const handleTabChange = useCallback(
    (nextTab: string) => {
      const typed = nextTab as WeldingQualityTab
      if (value === undefined) {
        setInternalTab(typed)
      }
      onValueChange?.(typed)
    },
    [value, onValueChange],
  )

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

  // Add Joint Category Dialog (Track 09 prerequisite)
  const [isAddJointCategoryOpen, setIsAddJointCategoryOpen] = useState(false)
  const [jointDefinition, setJointDefinition] = useState("")
  const [jointTiming, setJointTiming] = useState<"before_pressure_test" | "before_precommissioning" | "after_precommissioning">("before_pressure_test")
  const [jointCategoryCode, setJointCategoryCode] = useState("")
  const [jointReason, setJointReason] = useState("")
  const [jointCoefficient, setJointCoefficient] = useState("")
  const [jointCategoryErrors, setJointCategoryErrors] = useState<Record<string, string>>({})
  const [isSubmittingJointCategory, setIsSubmittingJointCategory] = useState(false)

  const requestVersionRef = useRef(0)

  const fetchReferences = useCallback(async () => {
    const currentVersion = ++requestVersionRef.current
    setLoading(true)
    setError(null)

    try {
      const client = getSupabaseBrowserClient()
      const result = await loadWeldingQualityReferences(client, projectId, identFilter)

      if (currentVersion === requestVersionRef.current) {
        setData(result)
        setLoading(false)
      }
    } catch (err: unknown) {
      if (currentVersion === requestVersionRef.current) {
        setError(err instanceof Error ? err.message : t("failedToLoad"))
        setLoading(false)
      }
    }
  }, [projectId, identFilter, t])

  useEffect(() => {
    fetchReferences()
  }, [fetchReferences])

  const handleClearIdentFilter = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete("ident")
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }, [pathname, router, searchParams])

  const handleCreateServiceClass = async (e: React.FormEvent) => {
    e.preventDefault()
    const validation = validateServiceClassInput({
      code: scCode,
      description: scDesc || null,
      materialTypeId: scMatTypeId,
    })

    if (!validation.ok) {
      setScErrors(formatFieldErrors(tIssues, validation.errors))
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
      toast.success(t("serviceClassCreated", { code: newSc.code }))
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("serviceClassFailed"))
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
      setWtErrors(formatFieldErrors(tIssues, validation.errors))
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
      toast.success(t("weldTypeCreated", { code: newWt.code }))
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("weldTypeFailed"))
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
      setWelderErrors(formatFieldErrors(tIssues, validation.errors))
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
      toast.success(t("welderQualified", { code: newWelder.welderCode }))
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("welderFailed"))
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
      setThickErrors(formatFieldErrors(tIssues, validation.errors))
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
      toast.success(t("thicknessRuleCreated"))
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("thicknessRuleFailed"))
    } finally {
      setIsSubmittingThick(false)
    }
  }

  const handleCreateReworkCode = async (e: React.FormEvent) => {
    e.preventDefault()
    const validation = validateReworkCodeInput({ code: reworkCode, description: reworkDesc })

    if (!validation.ok) {
      setReworkErrors(formatFieldErrors(tIssues, validation.errors))
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
      toast.success(t("defectCodeCreated", { code: newCode.code }))
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("defectCodeFailed"))
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
      setNdeErrors(formatFieldErrors(tIssues, validation.errors))
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
      toast.success(t("ndeRuleCreated"))
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("ndeRuleFailed"))
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
      setPmlErrors(formatFieldErrors(tIssues, validation.errors))
      return
    }

    setPmlErrors({})
    setIsSubmittingPml(true)

    try {
      const client = getSupabaseBrowserClient()
      const newRecord = await createPipingMaterialRecord(client, projectId, validation.value)
      setData((prev) => {
        if (!prev) return null
        if (identFilter !== null && newRecord.identCode !== identFilter) {
          return prev
        }
        return {
          ...prev,
          pipingMaterialRecords: [newRecord, ...prev.pipingMaterialRecords],
        }
      })
      setIsAddPmlOpen(false)
      setPmlMrr("")
      setPmlIdent("")
      setPmlTrace("")
      toast.success(t("pmlRecordAdded"))
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("pmlRecordFailed"))
    } finally {
      setIsSubmittingPml(false)
    }
  }

  const handleCreateJointCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    const validation = validateJointCategoryInput({
      jointDefinition,
      timing: jointTiming,
      categoryCode: jointCategoryCode,
      reason: jointReason,
      coefficient: jointCoefficient.trim() ? Number(jointCoefficient) : null,
    })
    if (!validation.ok) {
      setJointCategoryErrors(formatFieldErrors(tIssues, validation.errors))
      return
    }

    setJointCategoryErrors({})
    setIsSubmittingJointCategory(true)
    try {
      const category = await createJointCategory(getSupabaseBrowserClient(), projectId, validation.value)
      setData((prev) => prev ? { ...prev, jointCategories: [...prev.jointCategories, category].sort((a, b) => a.categoryCode.localeCompare(b.categoryCode)) } : null)
      setJointDefinition("")
      setJointTiming("before_pressure_test")
      setJointCategoryCode("")
      setJointReason("")
      setJointCoefficient("")
      setIsAddJointCategoryOpen(false)
      toast.success(t("jointCategoryCreated", { code: category.categoryCode }))
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("jointCategoryFailed"))
    } finally {
      setIsSubmittingJointCategory(false)
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
            <RefreshCw className="mr-2 h-4 w-4" /> {t("retry")}
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
    <Tabs
      value={activeTab}
      onValueChange={handleTabChange}
      variant="underline"
      className="space-y-4"
    >
      <TabsList>
        <TabsTrigger value="service-classes">
          {t("tabs.serviceClasses", { count: data?.serviceClasses.length ?? 0 })}
        </TabsTrigger>
        <TabsTrigger value="weld-types">
          {t("tabs.weldTypes", { count: data?.weldTypes.length ?? 0 })}
        </TabsTrigger>
        <TabsTrigger value="welders">
          {t("tabs.welders", { count: data?.welderQualifications.length ?? 0 })}
        </TabsTrigger>
        <TabsTrigger value="nde">
          <span>{t("tabs.nde", { count: data?.ndeMatrixRules.length ?? 0 })}</span>
          {ndeCoverage.missingTuples.length > 0 ? (
            <Badge variant="outline" className="text-warning-fg border-warning-border text-xs">
              {t("tabs.ndeIncomplete", { count: ndeCoverage.missingTuples.length })}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-success-fg border-success-border text-xs">
              {t("tabs.ndeComplete")}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="thickness">
          {t("tabs.thickness", { count: data?.thicknessFlangeRules.length ?? 0 })}
        </TabsTrigger>
        <TabsTrigger value="pml">
          {t("tabs.pml", { count: data?.pipingMaterialRecords.length ?? 0 })}
        </TabsTrigger>
        <TabsTrigger value="rework">
          {t("tabs.rework", { count: data?.reworkCodes.length ?? 0 })}
        </TabsTrigger>
        <TabsTrigger value="joint-categories">
          {t("tabs.jointCategories", { count: data?.jointCategories.length ?? 0 })}
        </TabsTrigger>
      </TabsList>

      {/* Service Classes View */}
      <TabsContent value="service-classes">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle>{t("serviceClassesTitle")}</CardTitle>
              <CardDescription>{t("serviceClassesDesc")}</CardDescription>
            </div>
            {canManage && (
              <Button size="sm" onClick={() => setIsAddScOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> {t("addServiceClass")}
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b text-left">
                  <tr>
                    <th className="p-3 font-medium">{t("columns.classCode")}</th>
                    <th className="p-3 font-medium">{t("columns.description")}</th>
                    <th className="p-3 font-medium">{t("columns.status")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(data?.serviceClasses ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-4 text-center text-muted-foreground">
                        {t("empty.serviceClasses")}
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
      </TabsContent>

      {/* Weld Types View */}
      <TabsContent value="weld-types">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle>{t("weldTypesTitle")}</CardTitle>
              <CardDescription>{t("weldTypesDesc")}</CardDescription>
            </div>
            {canManage && (
              <Button size="sm" onClick={() => setIsAddWtOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> {t("addWeldType")}
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b text-left">
                  <tr>
                    <th className="p-3 font-medium">{t("columns.weldCode")}</th>
                    <th className="p-3 font-medium">{t("columns.description")}</th>
                    <th className="p-3 font-medium">{t("columns.countsInDiaInch")}</th>
                    <th className="p-3 font-medium">{t("columns.status")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(data?.weldTypes ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-muted-foreground">
                        {t("empty.weldTypes")}
                      </td>
                    </tr>
                  ) : (
                    (data?.weldTypes ?? []).map((wt) => (
                      <tr key={wt.id}>
                        <td className="p-3 font-mono font-medium">{wt.code}</td>
                        <td className="p-3">{wt.description}</td>
                        <td className="p-3">
                          {wt.countsInDiaInch ? (
                            <Badge variant="outline" className="text-success-fg border-success-border">{t("badges.yes")}</Badge>
                          ) : (
                            <Badge variant="secondary">{t("badges.no")}</Badge>
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
      </TabsContent>

      {/* Welders View */}
      <TabsContent value="welders">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle>{t("weldersTitle")}</CardTitle>
              <CardDescription>{t("weldersDesc")}</CardDescription>
            </div>
            {canManage && (
              <Button size="sm" onClick={() => setIsAddWelderOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> {t("addWelder")}
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b text-left">
                  <tr>
                    <th className="p-3 font-medium">{t("columns.welderStencil")}</th>
                    <th className="p-3 font-medium">{t("columns.fullName")}</th>
                    <th className="p-3 font-medium">{t("columns.subcontractor")}</th>
                    <th className="p-3 font-medium">{t("columns.certificate")}</th>
                    <th className="p-3 font-medium">{t("columns.expiresOn")}</th>
                    <th className="p-3 font-medium">{t("columns.qualified")}</th>
                    <th className="p-3 font-medium">{t("columns.status")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(data?.welderQualifications ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-4 text-center text-muted-foreground">
                        {t("empty.welders")}
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
                            <Badge className="bg-success-bg text-success-fg border-success-border">{t("badges.valid")}</Badge>
                          ) : (
                            <Badge variant="destructive">{t("badges.expired")}</Badge>
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
      </TabsContent>

      {/* NDE Matrix View */}
      <TabsContent value="nde">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle>{t("ndeTitle")}</CardTitle>
              <CardDescription>{t("ndeDesc")}</CardDescription>
            </div>
            {canManage && (
              <Button size="sm" onClick={() => setIsAddNdeOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> {t("addNdeRule")}
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {ndeCoverage.missingTuples.length > 0 && (
              <div className="bg-warning-bg text-warning-fg border-warning-border flex items-center gap-2 rounded-md border p-3 text-sm">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>
                  {t("missingNdeCoverage", { count: ndeCoverage.missingTuples.length })}
                </span>
              </div>
            )}
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b text-left">
                  <tr>
                    <th className="p-3 font-medium">{t("columns.serviceClass")}</th>
                    <th className="p-3 font-medium">{t("columns.weldType")}</th>
                    <th className="p-3 font-medium">{t("columns.location")}</th>
                    <th className="p-3 font-medium">{t("columns.rtCoverage")}</th>
                    <th className="p-3 font-medium">{t("columns.utCoverage")}</th>
                    <th className="p-3 font-medium">{t("columns.mtCoverage")}</th>
                    <th className="p-3 font-medium">{t("columns.ptCoverage")}</th>
                    <th className="p-3 font-medium">{t("columns.pmiCoverage")}</th>
                    <th className="p-3 font-medium">{t("columns.pwhtReq")}</th>
                    <th className="p-3 font-medium">{t("columns.status")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(data?.ndeMatrixRules ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-4 text-center text-muted-foreground">
                        {t("empty.nde")}
                      </td>
                    </tr>
                  ) : (
                    (data?.ndeMatrixRules ?? []).map((nde) => (
                      <tr key={nde.id}>
                        <td className="p-3 font-mono font-medium">{nde.serviceClassCode || "—"}</td>
                        <td className="p-3 font-mono">{nde.weldTypeCode || "—"}</td>
                        <td className="p-3 capitalize">{nde.weldLocation === "shop" ? t("dialogs.locationShop") : nde.weldLocation === "field" ? t("dialogs.locationField") : nde.weldLocation}</td>
                        <td className="p-3 font-mono">{nde.rtCoverage}%</td>
                        <td className="p-3 font-mono">{nde.utCoverage}%</td>
                        <td className="p-3 font-mono">{nde.mtCoverage}%</td>
                        <td className="p-3 font-mono">{nde.ptCoverage}%</td>
                        <td className="p-3 font-mono">{nde.pmiCoverage}%</td>
                        <td className="p-3 font-mono">
                          {nde.pwhtRequired
                            ? nde.pwhtThicknessThreshold
                              ? t("badges.greaterMm", { threshold: nde.pwhtThicknessThreshold })
                              : t("badges.always")
                            : t("badges.no")}
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
      </TabsContent>

      {/* Thickness / Flange Rules View */}
      <TabsContent value="thickness">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle>{t("thicknessTitle")}</CardTitle>
              <CardDescription>{t("thicknessDesc")}</CardDescription>
            </div>
            {canManage && (
              <Button size="sm" onClick={() => setIsAddThickOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> {t("addThicknessRule")}
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b text-left">
                  <tr>
                    <th className="p-3 font-medium">{t("columns.serviceClass")}</th>
                    <th className="p-3 font-medium">{t("columns.diameterIn")}</th>
                    <th className="p-3 font-medium">{t("columns.thicknessMm")}</th>
                    <th className="p-3 font-medium">{t("columns.flangeRating")}</th>
                    <th className="p-3 font-medium">{t("columns.status")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(data?.thicknessFlangeRules ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-muted-foreground">
                        {t("empty.thickness")}
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
      </TabsContent>

      {/* PML Records View */}
      <TabsContent value="pml">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle>{t("pmlTitle")}</CardTitle>
              <CardDescription>{t("pmlDesc")}</CardDescription>
            </div>
            {canManage && (
              <Button size="sm" onClick={() => setIsAddPmlOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> {t("addPmlRecord")}
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {identFilter && (
              <div className="flex items-center justify-between rounded-md border border-sky-200 bg-sky-50 dark:border-sky-900 dark:bg-sky-950/50 p-3 text-sm text-sky-900 dark:text-sky-200">
                <div className="flex items-center gap-2">
                  <span>
                    {t("filterByIdent")} <span className="font-mono font-semibold">{identFilter}</span>
                  </span>
                </div>
                <Button size="sm" variant="outline" onClick={handleClearIdentFilter}>
                  {t("clearFilter")}
                </Button>
              </div>
            )}
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b text-left">
                  <tr>
                    <th className="p-3 font-medium">{t("columns.mrrNumber")}</th>
                    <th className="p-3 font-medium">{t("columns.identCode")}</th>
                    <th className="p-3 font-medium">{t("columns.traceHeatNumber")}</th>
                    <th className="p-3 font-medium">{t("columns.status")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(data?.pipingMaterialRecords ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-muted-foreground">
                        {identFilter
                          ? t("empty.pmlMatching", { ident: identFilter })
                          : t("empty.pml")}
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
      </TabsContent>

      {/* Rework Codes View */}
      <TabsContent value="rework">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle>{t("reworkTitle")}</CardTitle>
              <CardDescription>{t("reworkDesc")}</CardDescription>
            </div>
            {canManage && (
              <Button size="sm" onClick={() => setIsAddReworkOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> {t("addDefectCode")}
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b text-left">
                  <tr>
                    <th className="p-3 font-medium">{t("columns.code")}</th>
                    <th className="p-3 font-medium">{t("columns.description")}</th>
                    <th className="p-3 font-medium">{t("columns.status")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(data?.reworkCodes ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-4 text-center text-muted-foreground">
                        {t("empty.rework")}
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
      </TabsContent>

      {/* Joint Categories View */}
      <TabsContent value="joint-categories">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>{t("jointCategoriesTitle")}</CardTitle>
              <CardDescription>{t("jointCategoriesDesc")}</CardDescription>
            </div>
            {canManage && (
              <Button size="sm" onClick={() => setIsAddJointCategoryOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> {t("addJointCategory")}
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b text-left">
                  <tr>
                    <th className="p-3 font-medium">{t("columns.jointDefinition")}</th>
                    <th className="p-3 font-medium">{t("columns.timing")}</th>
                    <th className="p-3 font-medium">{t("columns.categoryCode")}</th>
                    <th className="p-3 font-medium">{t("columns.reason")}</th>
                    <th className="p-3 font-medium">{t("columns.status")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(data?.jointCategories ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-muted-foreground">
                        {t("empty.jointCategories")}
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
      </TabsContent>

      {/* Add Service Class Dialog */}
      <Dialog open={isAddScOpen} onOpenChange={setIsAddScOpen}>
        <DialogContent>
          <form onSubmit={handleCreateServiceClass}>
            <DialogHeader>
              <DialogTitle>{t("dialogs.addServiceClassTitle")}</DialogTitle>
              <DialogDescription>{t("dialogs.addServiceClassDesc")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-3">
              <div className="space-y-1.5">
                <Label htmlFor="sc-code">{t("dialogs.classCode")}</Label>
                <Input
                  id="sc-code"
                  placeholder={t("dialogs.classCodePlaceholder")}
                  value={scCode}
                  onChange={(e) => setScCode(e.target.value)}
                  disabled={isSubmittingSc}
                />
                {scErrors.code && <p className="text-xs text-destructive">{scErrors.code}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sc-desc">{t("dialogs.descriptionOptional")}</Label>
                <Input
                  id="sc-desc"
                  placeholder={t("dialogs.serviceClassDescPlaceholder")}
                  value={scDesc}
                  onChange={(e) => setScDesc(e.target.value)}
                  disabled={isSubmittingSc}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("dialogs.materialType")}</Label>
                <Select value={scMatTypeId} onValueChange={setScMatTypeId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("dialogs.selectMaterialType")} />
                  </SelectTrigger>
                  <SelectContent>
                    {(data?.materialTypes ?? []).length === 0 ? (
                      <SelectItem value="none" disabled>{t("dialogs.noActiveMaterialTypes")}</SelectItem>
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
                {t("dialogs.cancel")}
              </Button>
              <Button type="submit" disabled={isSubmittingSc}>
                {t("dialogs.addServiceClass")}
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
              <DialogTitle>{t("dialogs.addWeldTypeTitle")}</DialogTitle>
              <DialogDescription>{t("dialogs.addWeldTypeDesc")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-3">
              <div className="space-y-1.5">
                <Label htmlFor="wt-code">{t("dialogs.weldCode")}</Label>
                <Input
                  id="wt-code"
                  placeholder={t("dialogs.weldCodePlaceholder")}
                  value={wtCode}
                  onChange={(e) => setWtCode(e.target.value)}
                  disabled={isSubmittingWt}
                />
                {wtErrors.code && <p className="text-xs text-destructive">{wtErrors.code}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="wt-desc">{t("dialogs.weldDesc")}</Label>
                <Input
                  id="wt-desc"
                  placeholder={t("dialogs.weldDescPlaceholder")}
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
                    {t("dialogs.countsTowardsDiaInch")}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t("dialogs.countsTowardsDiaInchHint")}
                  </p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setIsAddWtOpen(false)} disabled={isSubmittingWt}>
                {t("dialogs.cancel")}
              </Button>
              <Button type="submit" disabled={isSubmittingWt}>
                {t("dialogs.addWeldType")}
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
              <DialogTitle>{t("dialogs.addWelderTitle")}</DialogTitle>
              <DialogDescription>
                {t("dialogs.addWelderDesc")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-3">
              <div className="space-y-1.5">
                <Label htmlFor="welder-code">{t("dialogs.welderStencil")}</Label>
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
                <Label htmlFor="welder-name">{t("dialogs.fullName")}</Label>
                <Input
                  id="welder-name"
                  placeholder={t("dialogs.welderNamePlaceholder")}
                  value={welderName}
                  onChange={(e) => setWelderName(e.target.value)}
                  disabled={isSubmittingWelder}
                />
                {welderErrors.fullName && <p className="text-xs text-destructive">{welderErrors.fullName}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>{t("dialogs.subcontractor")}</Label>
                <Select value={welderSubId} onValueChange={setWelderSubId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("dialogs.selectSubcontractor")} />
                  </SelectTrigger>
                  <SelectContent>
                    {(data?.subcontractors ?? []).length === 0 ? (
                      <SelectItem value="none" disabled>
                        {t("dialogs.noActiveSubcontractors")}
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
                <Label htmlFor="welder-cert">{t("dialogs.certificateNumberOptional")}</Label>
                <Input
                  id="welder-cert"
                  placeholder={t("dialogs.certNumberPlaceholder")}
                  value={welderCert}
                  onChange={(e) => setWelderCert(e.target.value)}
                  disabled={isSubmittingWelder}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="welder-expires">{t("dialogs.certificateExpiresOn")}</Label>
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
                <Label>{t("dialogs.approvedWps")}</Label>
                {/* A multi-select, not a dropdown: `save_welder_qualification` takes a list, and a
                    welder with no covering WPS is refused by the weld command later. */}
                {(data?.weldingProcedures ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {t("dialogs.noActiveWps")}
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
                {t("dialogs.cancel")}
              </Button>
              <Button type="submit" disabled={isSubmittingWelder}>
                {t("dialogs.addWelder")}
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
              <DialogTitle>{t("dialogs.addThicknessTitle")}</DialogTitle>
              <DialogDescription>
                {t("dialogs.addThicknessDesc")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-3">
              <div className="space-y-1.5">
                <Label>{t("dialogs.serviceClass")}</Label>
                <Select value={thickScId} onValueChange={setThickScId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("dialogs.selectServiceClass")} />
                  </SelectTrigger>
                  <SelectContent>
                    {activeServiceClasses.length === 0 ? (
                      <SelectItem value="none" disabled>{t("dialogs.noActiveServiceClasses")}</SelectItem>
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
                  <Label htmlFor="thick-dia">{t("dialogs.diameterInch")}</Label>
                  <Input
                    id="thick-dia"
                    type="number"
                    step="0.5"
                    min="0"
                    placeholder={t("dialogs.diameterPlaceholder")}
                    value={thickDia}
                    onChange={(e) => setThickDia(e.target.value)}
                    disabled={isSubmittingThick}
                  />
                  {thickErrors.diameterInch && (
                    <p className="text-xs text-destructive">{thickErrors.diameterInch}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="thick-mm">{t("dialogs.thicknessMm")}</Label>
                  <Input
                    id="thick-mm"
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder={t("dialogs.thicknessPlaceholder")}
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
                <Label htmlFor="thick-rating">{t("dialogs.flangeRating")}</Label>
                <Input
                  id="thick-rating"
                  placeholder={t("dialogs.flangeRatingPlaceholder")}
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
                {t("dialogs.cancel")}
              </Button>
              <Button type="submit" disabled={isSubmittingThick}>
                {t("dialogs.addRule")}
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
              <DialogTitle>{t("dialogs.addNdeTitle")}</DialogTitle>
              <DialogDescription>
                {t("dialogs.addNdeDesc")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-3">
              <div className="space-y-1.5">
                <Label>{t("dialogs.serviceClass")}</Label>
                <Select value={ndeScId} onValueChange={setNdeScId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("dialogs.selectServiceClass")} />
                  </SelectTrigger>
                  <SelectContent>
                    {activeServiceClasses.length === 0 ? (
                      <SelectItem value="none" disabled>{t("dialogs.noActiveServiceClasses")}</SelectItem>
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
                <Label>{t("dialogs.weldType")}</Label>
                <Select value={ndeWtId} onValueChange={setNdeWtId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("dialogs.selectWeldType")} />
                  </SelectTrigger>
                  <SelectContent>
                    {activeWeldTypes.length === 0 ? (
                      <SelectItem value="none" disabled>{t("dialogs.noActiveWeldTypes")}</SelectItem>
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
                <Label>{t("dialogs.weldLocation")}</Label>
                {/* Assembly is a disabled extension point: `PQC50` refuses an assembly weld, and
                    the coverage check above only expects shop and field, so offering assembly here
                    would invite a rule for work this project can never record. */}
                <Select value={ndeLoc} onValueChange={(value) => setNdeLoc(value as "shop" | "field")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="shop">{t("dialogs.locationShop")}</SelectItem>
                    <SelectItem value="field">{t("dialogs.locationField")}</SelectItem>
                  </SelectContent>
                </Select>
                {ndeErrors.weldLocation && <p className="text-xs text-destructive">{ndeErrors.weldLocation}</p>}
              </div>

              <div className="space-y-2">
                <Label>{t("dialogs.coveragePercent")}</Label>
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
                  {t("dialogs.materialTraceabilityRequired")}
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
                    {t("dialogs.pwhtRequired")}
                  </Label>
                </div>
                {ndePwhtReq && (
                  <div className="space-y-1.5 pl-6">
                    <Label htmlFor="nde-pwht-thick">{t("dialogs.thicknessThresholdOptional")}</Label>
                    <Input
                      id="nde-pwht-thick"
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder={t("dialogs.pwhtThresholdHint")}
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
                {t("dialogs.cancel")}
              </Button>
              <Button type="submit" disabled={isSubmittingNde}>
                {t("dialogs.addNdeRule")}
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
              <DialogTitle>{t("dialogs.addPmlTitle")}</DialogTitle>
              <DialogDescription>
                {t("dialogs.addPmlDesc")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-3">
              <div className="space-y-1.5">
                <Label htmlFor="pml-mrr">{t("dialogs.mrrNumber")}</Label>
                <Input
                  id="pml-mrr"
                  placeholder={t("dialogs.mrrPlaceholder")}
                  value={pmlMrr}
                  onChange={(e) => setPmlMrr(e.target.value)}
                  disabled={isSubmittingPml}
                />
                {pmlErrors.mrrNumber && <p className="text-xs text-destructive">{pmlErrors.mrrNumber}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pml-ident">{t("dialogs.identCode")}</Label>
                <Input
                  id="pml-ident"
                  placeholder={t("dialogs.identPlaceholder")}
                  value={pmlIdent}
                  onChange={(e) => setPmlIdent(e.target.value)}
                  disabled={isSubmittingPml}
                />
                {pmlErrors.identCode && <p className="text-xs text-destructive">{pmlErrors.identCode}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pml-trace">{t("dialogs.traceHeatNumber")}</Label>
                <Input
                  id="pml-trace"
                  placeholder={t("dialogs.tracePlaceholder")}
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
                {t("dialogs.cancel")}
              </Button>
              <Button type="submit" disabled={isSubmittingPml}>
                {t("dialogs.addPmlRecord")}
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
              <DialogTitle>{t("dialogs.addDefectTitle")}</DialogTitle>
              <DialogDescription>
                {t("dialogs.addDefectDesc")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-3">
              <div className="space-y-1.5">
                <Label htmlFor="rework-code">{t("dialogs.defectCode")}</Label>
                <Input
                  id="rework-code"
                  placeholder={t("dialogs.defectCodePlaceholder")}
                  value={reworkCode}
                  onChange={(e) => setReworkCode(e.target.value)}
                  disabled={isSubmittingRework}
                />
                {reworkErrors.code && <p className="text-xs text-destructive">{reworkErrors.code}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rework-desc">{t("dialogs.defectDesc")}</Label>
                <Input
                  id="rework-desc"
                  placeholder={t("dialogs.defectDescPlaceholder")}
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
                {t("dialogs.cancel")}
              </Button>
              <Button type="submit" disabled={isSubmittingRework}>
                {t("dialogs.addDefectCode")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddJointCategoryOpen} onOpenChange={(open) => { if (!open) setIsAddJointCategoryOpen(false) }}>
        <DialogContent>
          <form onSubmit={handleCreateJointCategory}>
            <DialogHeader>
              <DialogTitle>{t("dialogs.addJointCategoryTitle")}</DialogTitle>
              <DialogDescription>{t("dialogs.addJointCategoryDesc")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-3">
              <div>
                <Label htmlFor="joint-definition">{t("dialogs.jointDefinition")}</Label>
                <Input id="joint-definition" value={jointDefinition} onChange={(e) => setJointDefinition(e.target.value)} disabled={isSubmittingJointCategory} />
                {jointCategoryErrors.jointDefinition && <p className="mt-1 text-xs text-destructive">{jointCategoryErrors.jointDefinition}</p>}
              </div>
              <div>
                <Label htmlFor="joint-timing">{t("dialogs.timing")}</Label>
                <Select value={jointTiming} onValueChange={(value) => setJointTiming(value as typeof jointTiming)}>
                  <SelectTrigger id="joint-timing"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="before_pressure_test">{t("dialogs.timingBeforePressureTest")}</SelectItem>
                    <SelectItem value="before_precommissioning">{t("dialogs.timingBeforePrecommissioning")}</SelectItem>
                    <SelectItem value="after_precommissioning">{t("dialogs.timingAfterPrecommissioning")}</SelectItem>
                  </SelectContent>
                </Select>
                {jointCategoryErrors.timing && <p className="mt-1 text-xs text-destructive">{jointCategoryErrors.timing}</p>}
              </div>
              <div>
                <Label htmlFor="joint-category-code">{t("dialogs.categoryCode")}</Label>
                <Input id="joint-category-code" placeholder={t("dialogs.categoryPlaceholder")} value={jointCategoryCode} onChange={(e) => setJointCategoryCode(e.target.value)} disabled={isSubmittingJointCategory} />
                {jointCategoryErrors.categoryCode && <p className="mt-1 text-xs text-destructive">{jointCategoryErrors.categoryCode}</p>}
              </div>
              <div>
                <Label htmlFor="joint-reason">{t("dialogs.reason")}</Label>
                <Input id="joint-reason" value={jointReason} onChange={(e) => setJointReason(e.target.value)} disabled={isSubmittingJointCategory} />
                {jointCategoryErrors.reason && <p className="mt-1 text-xs text-destructive">{jointCategoryErrors.reason}</p>}
              </div>
              <div>
                <Label htmlFor="joint-coefficient">{t("dialogs.punchCoefficientOptional")}</Label>
                <Input id="joint-coefficient" type="number" step="0.001" value={jointCoefficient} onChange={(e) => setJointCoefficient(e.target.value)} disabled={isSubmittingJointCategory} />
                {jointCategoryErrors.coefficient && <p className="mt-1 text-xs text-destructive">{jointCategoryErrors.coefficient}</p>}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddJointCategoryOpen(false)} disabled={isSubmittingJointCategory}>{t("dialogs.cancel")}</Button>
              <Button type="submit" loading={isSubmittingJointCategory}>{t("dialogs.create")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Tabs>
  )
}
