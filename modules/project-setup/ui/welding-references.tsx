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
import { type DataColumn } from "@/components/ui/data-table"
import { SupabaseWpsTab } from "@/components/admin/supabase-wps-tab"
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
  type ServiceClass,
  type WeldType,
  type WelderQualification,
  type NdeMatrixRule,
  type ThicknessFlangeRule,
  type PipingMaterialRecord,
  type ReworkCode,
  type JointCategory,
} from "../domain/welding-quality-reference"
import { ReferenceStatusBadge } from "./reference-status-badge"
import type { ReferenceKeyOf } from "./reference-catalog"
import { ReferencePane, ReferenceTable } from "./reference-pane"
import { ReferenceImportLink } from "./reference-import-link"

type WeldingT = ReturnType<typeof useTranslations<"projectSetup.weldingQuality">>

function serviceClassColumns(t: WeldingT): ReadonlyArray<DataColumn<ServiceClass>> {
  return [
    { id: "code", header: t("columns.classCode"), value: (row) => row.code, searchable: true, alwaysVisible: true, className: "font-mono font-medium" },
    { id: "description", header: t("columns.description"), value: (row) => row.description ?? "", searchable: true, cell: (row) => row.description || "—" },
    { id: "status", header: t("columns.status"), value: (row) => row.status, cell: (row) => <ReferenceStatusBadge status={row.status} /> },
  ]
}

function weldTypeColumns(t: WeldingT): ReadonlyArray<DataColumn<WeldType>> {
  return [
    { id: "code", header: t("columns.weldCode"), value: (row) => row.code, searchable: true, alwaysVisible: true, className: "font-mono font-medium" },
    { id: "description", header: t("columns.description"), value: (row) => row.description, searchable: true },
    {
      id: "countsInDiaInch",
      header: t("columns.countsInDiaInch"),
      value: (row) => (row.countsInDiaInch ? t("badges.yes") : t("badges.no")),
      cell: (row) =>
        row.countsInDiaInch ? (
          <Badge variant="outline" className="text-success-fg border-success-border">
            {t("badges.yes")}
          </Badge>
        ) : (
          <Badge variant="secondary">{t("badges.no")}</Badge>
        ),
    },
    { id: "status", header: t("columns.status"), value: (row) => row.status, cell: (row) => <ReferenceStatusBadge status={row.status} /> },
  ]
}

function welderColumns(t: WeldingT): ReadonlyArray<DataColumn<WelderQualification>> {
  return [
    { id: "welderCode", header: t("columns.welderStencil"), value: (row) => row.welderCode, searchable: true, alwaysVisible: true, className: "font-mono font-medium" },
    { id: "fullName", header: t("columns.fullName"), value: (row) => row.fullName, searchable: true },
    { id: "subcontractor", header: t("columns.subcontractor"), value: (row) => row.subcontractorCode ?? "", searchable: true, cell: (row) => row.subcontractorCode || "—", className: "font-mono" },
    { id: "certificate", header: t("columns.certificate"), value: (row) => row.certificateNumber ?? "", searchable: true, cell: (row) => row.certificateNumber || "—", className: "font-mono" },
    { id: "expiresOn", header: t("columns.expiresOn"), value: (row) => row.expiresOn, className: "font-mono" },
    {
      id: "qualified",
      header: t("columns.qualified"),
      value: (row) => (row.isCurrentlyQualified ? t("badges.valid") : t("badges.expired")),
      cell: (row) =>
        row.isCurrentlyQualified ? (
          <Badge className="bg-success-bg text-success-fg border-success-border">
            {t("badges.valid")}
          </Badge>
        ) : (
          <Badge variant="destructive">{t("badges.expired")}</Badge>
        ),
    },
    { id: "status", header: t("columns.status"), value: (row) => row.status, cell: (row) => <ReferenceStatusBadge status={row.status} /> },
  ]
}
function ndeMatrixColumns(t: WeldingT): ReadonlyArray<DataColumn<NdeMatrixRule>> {
  return [
    { id: "serviceClass", header: t("columns.serviceClass"), value: (row) => row.serviceClassCode ?? "", searchable: true, alwaysVisible: true, cell: (row) => row.serviceClassCode || "—", className: "font-mono font-medium" },
    { id: "weldType", header: t("columns.weldType"), value: (row) => row.weldTypeCode ?? "", searchable: true, cell: (row) => row.weldTypeCode || "—", className: "font-mono" },
    {
      id: "location",
      header: t("columns.location"),
      value: (row) => (row.weldLocation === "shop" ? t("dialogs.locationShop") : row.weldLocation === "field" ? t("dialogs.locationField") : row.weldLocation),
      cell: (row) => (
        <span className="capitalize">
          {row.weldLocation === "shop" ? t("dialogs.locationShop") : row.weldLocation === "field" ? t("dialogs.locationField") : row.weldLocation}
        </span>
      ),
    },
    { id: "rtCoverage", header: t("columns.rtCoverage"), value: (row) => row.rtCoverage, cell: (row) => `${row.rtCoverage}%`, className: "font-mono" },
    { id: "utCoverage", header: t("columns.utCoverage"), value: (row) => row.utCoverage, cell: (row) => `${row.utCoverage}%`, className: "font-mono" },
    { id: "mtCoverage", header: t("columns.mtCoverage"), value: (row) => row.mtCoverage, cell: (row) => `${row.mtCoverage}%`, className: "font-mono" },
    { id: "ptCoverage", header: t("columns.ptCoverage"), value: (row) => row.ptCoverage, cell: (row) => `${row.ptCoverage}%`, className: "font-mono" },
    { id: "pmiCoverage", header: t("columns.pmiCoverage"), value: (row) => row.pmiCoverage, cell: (row) => `${row.pmiCoverage}%`, className: "font-mono" },
    {
      id: "pwhtReq",
      header: t("columns.pwhtReq"),
      value: (row) =>
        row.pwhtRequired
          ? row.pwhtThicknessThreshold
            ? t("badges.greaterMm", { threshold: row.pwhtThicknessThreshold })
            : t("badges.always")
          : t("badges.no"),
      cell: (row) =>
        row.pwhtRequired
          ? row.pwhtThicknessThreshold
            ? t("badges.greaterMm", { threshold: row.pwhtThicknessThreshold })
            : t("badges.always")
          : t("badges.no"),
      className: "font-mono",
    },
    { id: "status", header: t("columns.status"), value: (row) => row.status, cell: (row) => <ReferenceStatusBadge status={row.status} /> },
  ]
}

function thicknessFlangeColumns(t: WeldingT): ReadonlyArray<DataColumn<ThicknessFlangeRule>> {
  return [
    { id: "serviceClass", header: t("columns.serviceClass"), value: (row) => row.serviceClassCode ?? "", searchable: true, alwaysVisible: true, cell: (row) => row.serviceClassCode || "—", className: "font-mono font-medium" },
    { id: "diameterInch", header: t("columns.diameterIn"), value: (row) => row.diameterInch, cell: (row) => `${row.diameterInch}"`, className: "font-mono" },
    { id: "thicknessMm", header: t("columns.thicknessMm"), value: (row) => row.thicknessMm, cell: (row) => <>{row.thicknessMm} mm</>, className: "font-mono" },
    { id: "flangeRating", header: t("columns.flangeRating"), value: (row) => row.flangeRating, searchable: true, className: "font-mono" },
    { id: "status", header: t("columns.status"), value: (row) => row.status, cell: (row) => <ReferenceStatusBadge status={row.status} /> },
  ]
}

function pipingMaterialColumns(t: WeldingT): ReadonlyArray<DataColumn<PipingMaterialRecord>> {
  return [
    { id: "mrrNumber", header: t("columns.mrrNumber"), value: (row) => row.mrrNumber, searchable: true, alwaysVisible: true, className: "font-mono font-medium" },
    { id: "identCode", header: t("columns.identCode"), value: (row) => row.identCode, searchable: true, className: "font-mono" },
    { id: "traceHeatNumber", header: t("columns.traceHeatNumber"), value: (row) => row.traceNumber, searchable: true, className: "font-mono" },
    { id: "status", header: t("columns.status"), value: (row) => row.status, cell: (row) => <ReferenceStatusBadge status={row.status} /> },
  ]
}

function reworkCodeColumns(t: WeldingT): ReadonlyArray<DataColumn<ReworkCode>> {
  return [
    { id: "code", header: t("columns.code"), value: (row) => row.code, searchable: true, alwaysVisible: true, className: "font-mono font-medium" },
    { id: "description", header: t("columns.description"), value: (row) => row.description, searchable: true },
    { id: "status", header: t("columns.status"), value: (row) => row.status, cell: (row) => <ReferenceStatusBadge status={row.status} /> },
  ]
}

function jointCategoryColumns(t: WeldingT): ReadonlyArray<DataColumn<JointCategory>> {
  return [
    { id: "jointDefinition", header: t("columns.jointDefinition"), value: (row) => row.jointDefinition, searchable: true, alwaysVisible: true, className: "font-medium" },
    { id: "timing", header: t("columns.timing"), value: (row) => row.timing, className: "text-muted-foreground" },
    { id: "categoryCode", header: t("columns.categoryCode"), value: (row) => row.categoryCode, searchable: true, className: "font-mono" },
    { id: "reason", header: t("columns.reason"), value: (row) => row.reason, searchable: true },
    { id: "status", header: t("columns.status"), value: (row) => row.status, cell: (row) => <ReferenceStatusBadge status={row.status} /> },
  ]
}


export function WeldingReferences({
  projectId,
  canManage,
  reference,
}: {
  projectId: string
  canManage: boolean
  reference: ReferenceKeyOf<"welding">
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
      <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-6">
        <div className="flex items-center gap-3 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <p className="font-medium">{error}</p>
        </div>
        <Button variant="outline" className="mt-4" onClick={fetchReferences}>
          <RefreshCw className="mr-2 h-4 w-4" /> {t("retry")}
        </Button>
      </div>
    )
  }

  if (!data) return null

  const activeServiceClasses = data.serviceClasses.filter((sc) => sc.status === "active")
  const activeWeldTypes = data.weldTypes.filter((wt) => wt.status === "active")
  const activeNdeRules = data.ndeMatrixRules.filter((r) => r.status === "active")

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
    <>
      {/* Service Classes View */}
      {reference === "service-classes" && (
        <ReferencePane
          title={t("serviceClassesTitle")}
          description={t("serviceClassesDesc")}
          count={data.serviceClasses.length}
          actions={canManage ? (
            <Button size="sm" onClick={() => setIsAddScOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> {t("addServiceClass")}
            </Button>
          ) : null}
        >
          <ReferenceTable
            key={reference}
            columns={serviceClassColumns(t)}
            rows={data.serviceClasses}
            rowId={(row) => row.id}
            emptyTitle={t("empty.serviceClasses")}
          />
        </ReferencePane>
      )}

      {/* Weld Types View */}
      {reference === "weld-types" && (
        <ReferencePane
          title={t("weldTypesTitle")}
          description={t("weldTypesDesc")}
          count={data.weldTypes.length}
          actions={canManage ? (
            <Button size="sm" onClick={() => setIsAddWtOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> {t("addWeldType")}
            </Button>
          ) : null}
        >
          <ReferenceTable
            key={reference}
            columns={weldTypeColumns(t)}
            rows={data.weldTypes}
            rowId={(row) => row.id}
            emptyTitle={t("empty.weldTypes")}
          />
        </ReferencePane>
      )}

      {/* Welders View */}
      {reference === "welders" && (
        <ReferencePane
          title={t("weldersTitle")}
          description={t("weldersDesc")}
          count={data.welderQualifications.length}
          actions={canManage ? (
            <>
              <ReferenceImportLink reference={reference} />
              <Button size="sm" onClick={() => setIsAddWelderOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> {t("addWelder")}
              </Button>
            </>
          ) : null}
        >
          <ReferenceTable
            key={reference}
            columns={welderColumns(t)}
            rows={data.welderQualifications}
            rowId={(row) => row.id}
            emptyTitle={t("empty.welders")}
          />
        </ReferencePane>
      )}

      {/* WPS View */}
      {reference === "wps" && <SupabaseWpsTab />}

      {/* NDE Matrix View */}
      {reference === "nde" && (
        <ReferencePane
          title={t("ndeTitle")}
          description={t("ndeDesc")}
          count={data.ndeMatrixRules.length}
          status={
            ndeCoverage.missingTuples.length > 0 ? (
              <Badge variant="outline" className="text-warning-fg border-warning-border text-xs">
                {t("ndeCoverageIncomplete", { count: ndeCoverage.missingTuples.length })}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-success-fg border-success-border text-xs">
                {t("ndeCoverageComplete")}
              </Badge>
            )
          }
          actions={canManage ? (
            <>
              <ReferenceImportLink reference={reference} />
              <Button size="sm" onClick={() => setIsAddNdeOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> {t("addNdeRule")}
              </Button>
            </>
          ) : null}
        >
          {ndeCoverage.missingTuples.length > 0 && (
            <div className="bg-warning-bg text-warning-fg border-warning-border flex items-center gap-2 rounded-md border p-3 text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>
                {t("missingNdeCoverage", { count: ndeCoverage.missingTuples.length })}
              </span>
            </div>
          )}
          <ReferenceTable
            key={reference}
            columns={ndeMatrixColumns(t)}
            rows={data.ndeMatrixRules}
            rowId={(row) => row.id}
            emptyTitle={t("empty.nde")}
          />
        </ReferencePane>
      )}

      {/* Thickness / Flange Rules View */}
      {reference === "thickness" && (
        <ReferencePane
          title={t("thicknessTitle")}
          description={t("thicknessDesc")}
          count={data.thicknessFlangeRules.length}
          actions={canManage ? (
            <>
              <ReferenceImportLink reference={reference} />
              <Button size="sm" onClick={() => setIsAddThickOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> {t("addThicknessRule")}
              </Button>
            </>
          ) : null}
        >
          <ReferenceTable
            key={reference}
            columns={thicknessFlangeColumns(t)}
            rows={data.thicknessFlangeRules}
            rowId={(row) => row.id}
            emptyTitle={t("empty.thickness")}
          />
        </ReferencePane>
      )}

      {/* PML Records View */}
      {reference === "pml" && (
        <ReferencePane
          title={t("pmlTitle")}
          description={t("pmlDesc")}
          count={data.pipingMaterialRecords.length}
          actions={canManage ? (
            <>
              <ReferenceImportLink reference={reference} />
              <Button size="sm" onClick={() => setIsAddPmlOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> {t("addPmlRecord")}
              </Button>
            </>
          ) : null}
        >
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
          <ReferenceTable
            key={reference}
            columns={pipingMaterialColumns(t)}
            rows={data.pipingMaterialRecords}
            rowId={(row) => row.id}
            emptyTitle={identFilter ? t("empty.pmlMatching", { ident: identFilter }) : t("empty.pml")}
          />
        </ReferencePane>
      )}

      {/* Rework Codes View */}
      {reference === "rework" && (
        <ReferencePane
          title={t("reworkTitle")}
          description={t("reworkDesc")}
          count={data.reworkCodes.length}
          actions={canManage ? (
            <Button size="sm" onClick={() => setIsAddReworkOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> {t("addDefectCode")}
            </Button>
          ) : null}
        >
          <ReferenceTable
            key={reference}
            columns={reworkCodeColumns(t)}
            rows={data.reworkCodes}
            rowId={(row) => row.id}
            emptyTitle={t("empty.rework")}
          />
        </ReferencePane>
      )}

      {/* Joint Categories View */}
      {reference === "joint-categories" && (
        <ReferencePane
          title={t("jointCategoriesTitle")}
          description={t("jointCategoriesDesc")}
          count={data.jointCategories.length}
          actions={canManage ? (
            <Button size="sm" onClick={() => setIsAddJointCategoryOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> {t("addJointCategory")}
            </Button>
          ) : null}
        >
          <ReferenceTable
            key={reference}
            columns={jointCategoryColumns(t)}
            rows={data.jointCategories}
            rowId={(row) => row.id}
            emptyTitle={t("empty.jointCategories")}
          />
        </ReferencePane>
      )}

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
                  placeholder={t("dialogs.welderStencilPlaceholder")}
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
    </>
  )
}
