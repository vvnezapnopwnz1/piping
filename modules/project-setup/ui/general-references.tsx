"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { formatFieldErrors } from "./setup-field-issue"

import { AlertCircle, Plus, RefreshCw } from "lucide-react"
import { toast } from "sonner"

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
import { type ReferenceKeyOf } from "./reference-catalog"
import { ReferencePane, ReferenceTable } from "./reference-pane"
import { AddAnotherToggle } from "./add-another-toggle"
import {
  validateSubcontractorInput,
  validateUnitInput,
  validateAreaClassificationInput,
  validatePdsAreaInput,
  type Subcontractor,
  type Unit,
  type AreaClassification,
  type PdsArea,
} from "../domain/project-geography"

/**
 * `<SelectItem value="">` makes Radix throw during render — an empty string is reserved for
 * clearing a Select — so an optional reference uses this sentinel and maps it back to null.
 */
const NO_SELECTION = "__none__"

const optionalId = (value: string): string | null =>
  value === "" || value === NO_SELECTION ? null : value

// Same typing as `FlangeColumnsTranslator` in modules/flange/ui/flange-management-screen.tsx:28.
type GeneralT = ReturnType<typeof useTranslations<"projectSetup.projectGeography">>

function subcontractorColumns(t: GeneralT): ReadonlyArray<DataColumn<Subcontractor>> {
  return [
    { id: "code", header: t("columns.code"), value: (row) => row.code, searchable: true, alwaysVisible: true, className: "font-mono font-medium" },
    { id: "description", header: t("columns.description"), value: (row) => row.description, searchable: true },
    { id: "contactDetails", header: t("columns.contactDetails"), value: (row) => row.contactDetails ?? "", searchable: true, cell: (row) => row.contactDetails || "—", className: "text-muted-foreground" },
    { id: "status", header: t("columns.status"), value: (row) => row.status, cell: (row) => <ReferenceStatusBadge status={row.status} /> },
  ]
}

function unitColumns(t: GeneralT): ReadonlyArray<DataColumn<Unit>> {
  return [
    { id: "code", header: t("columns.unitCode"), value: (row) => row.code, searchable: true, alwaysVisible: true, className: "font-mono font-medium" },
    { id: "description", header: t("columns.description"), value: (row) => row.description, searchable: true },
    { id: "status", header: t("columns.status"), value: (row) => row.status, cell: (row) => <ReferenceStatusBadge status={row.status} /> },
  ]
}

function areaClassificationColumns(t: GeneralT): ReadonlyArray<DataColumn<AreaClassification>> {
  return [
    { id: "code", header: t("columns.areaCode"), value: (row) => row.code, searchable: true, alwaysVisible: true, className: "font-mono font-medium" },
    { id: "description", header: t("columns.description"), value: (row) => row.description, searchable: true },
    { id: "associatedUnit", header: t("columns.associatedUnit"), value: (row) => row.unitCode ?? "", cell: (row) => row.unitCode || "—", className: "font-mono text-muted-foreground" },
    { id: "status", header: t("columns.status"), value: (row) => row.status, cell: (row) => <ReferenceStatusBadge status={row.status} /> },
  ]
}

function pdsAreaColumns(t: GeneralT): ReadonlyArray<DataColumn<PdsArea>> {
  return [
    { id: "code", header: t("columns.pdsCode"), value: (row) => row.code, searchable: true, alwaysVisible: true, className: "font-mono font-medium" },
    { id: "description", header: t("columns.description"), value: (row) => row.description, searchable: true },
    { id: "shopSub", header: t("columns.shopSub"), value: (row) => row.shopSubcontractorCode ?? "", searchable: true, cell: (row) => row.shopSubcontractorCode || "—", className: "font-mono" },
    { id: "assemblySub", header: t("columns.assemblySub"), value: (row) => row.assemblySubcontractorCode ?? "", searchable: true, cell: (row) => row.assemblySubcontractorCode || "—", className: "font-mono" },
    { id: "fieldSub", header: t("columns.fieldSub"), value: (row) => row.fieldSubcontractorCode ?? "", searchable: true, cell: (row) => row.fieldSubcontractorCode || "—", className: "font-mono" },
    { id: "status", header: t("columns.status"), value: (row) => row.status, cell: (row) => <ReferenceStatusBadge status={row.status} /> },
  ]
}

export function GeneralReferences({
  projectId,
  canManage,
  reference,
}: {
  projectId: string
  canManage: boolean
  reference: ReferenceKeyOf<"general">
}) {
  const t = useTranslations("projectSetup.projectGeography")
  const tIssues = useTranslations("projectSetup.issues")
  const [loading, setLoading] = useState(true)
  const [addAnother, setAddAnother] = useState(false)

  const [error, setError] = useState<string | null>(null)
  const [geography, setGeography] = useState<LoadedProjectGeography | null>(null)

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
        setError(err.message || t("failedToLoad"))
        setLoading(false)
      }
    }
  }, [projectId, t])

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
      setSubErrors(formatFieldErrors(tIssues, validation.errors))
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
      if (!addAnother) setIsAddSubOpen(false)
      setSubCode("")
      setSubDesc("")
      setSubContact("")
      toast.success(t("subcontractorAdded", { code: newSub.code }))
    } catch (err: any) {
      toast.error(err.message || t("subcontractorFailed"))
    } finally {
      setIsSubmittingSub(false)
    }
  }

  const handleCreateUnit = async (e: React.FormEvent) => {
    e.preventDefault()
    const validation = validateUnitInput({ code: unitCode, description: unitDesc })

    if (!validation.ok) {
      setUnitErrors(formatFieldErrors(tIssues, validation.errors))
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
      if (!addAnother) setIsAddUnitOpen(false)
      setUnitCode("")
      setUnitDesc("")
      toast.success(t("unitAdded", { code: newUnit.code }))
    } catch (err: any) {
      toast.error(err.message || t("unitFailed"))
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
      setAcErrors(formatFieldErrors(tIssues, validation.errors))
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
      if (!addAnother) setIsAddAcOpen(false)
      setAcCode("")
      setAcDesc("")
      if (!addAnother) setAcUnitId("")
      toast.success(t("areaClassificationAdded", { code: newAc.code }))
    } catch (err: any) {
      toast.error(err.message || t("areaClassificationFailed"))
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
      setPdsErrors(formatFieldErrors(tIssues, validation.errors))
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
      if (!addAnother) setIsAddPdsOpen(false)
      setPdsCode("")
      setPdsDesc("")
      if (!addAnother) {
        setShopSubId("")
        setAssemblySubId("")
        setFieldSubId("")
        setAreaClassId("")
        setEnv("above_ground")
        setIsUnitFlag(false)
        setIsRackFlag(false)
      }
      setPdsCustomValues({})
      toast.success(t("pdsAreaAdded", { code: newPds.code }))
    } catch (err: any) {
      toast.error(err.message || t("pdsAreaFailed"))
    } finally {
      setIsSubmittingPds(false)
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
        <Button variant="outline" className="mt-4" onClick={fetchGeography}>
          <RefreshCw className="mr-2 h-4 w-4" /> {t("retry")}
        </Button>
      </div>
    )
  }

  if (!geography) return null

  const activeSubcontractors = geography.subcontractors.filter((s) => s.status === "active")
  const activeUnits = geography.units.filter((u) => u.status === "active")
  const activePdsCustomFields = geography.customFields.filter(
    (f) => f.scope === "pds_area" && f.status === "active"
  )

  return (
    <>
      {/* Subcontractors View */}
      {reference === "subcontractors" && (
        <ReferencePane
          title={t("subcontractorsTitle")}
          description={t("subcontractorsDesc")}
          count={geography.subcontractors.length}
          actions={canManage ? (
            <Button size="sm" onClick={() => setIsAddSubOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> {t("addSubcontractor")}
            </Button>
          ) : null}
        >
          <ReferenceTable
            key={reference}
            columns={subcontractorColumns(t)}
            rows={geography.subcontractors}
            rowId={(row) => row.id}
            emptyTitle={t("noSubcontractors")}
            searchPlaceholder={t("searchSubcontractors")}
          />
        </ReferencePane>
      )}

      {/* Units View */}
      {reference === "units" && (
        <ReferencePane
          title={t("unitsTitle")}
          description={t("unitsDesc")}
          count={geography.units.length}
          actions={canManage ? (
            <Button size="sm" onClick={() => setIsAddUnitOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> {t("addUnit")}
            </Button>
          ) : null}
        >
          <ReferenceTable
            key={reference}
            columns={unitColumns(t)}
            rows={geography.units}
            rowId={(row) => row.id}
            emptyTitle={t("noUnits")}
          />
        </ReferencePane>
      )}

      {/* Area Classifications View */}
      {reference === "area-classifications" && (
        <ReferencePane
          title={t("areaClassificationsTitle")}
          description={t("areaClassificationsDesc")}
          count={geography.areaClassifications.length}
          actions={canManage ? (
            <Button
              size="sm"
              onClick={() => setIsAddAcOpen(true)}
              disabled={activeUnits.length === 0}
              title={
                activeUnits.length === 0
                  ? t("addActiveUnitFirst")
                  : undefined
              }
            >
              <Plus className="mr-2 h-4 w-4" /> {t("addAreaClassification")}
            </Button>
          ) : null}
        >
          <ReferenceTable
            key={reference}
            columns={areaClassificationColumns(t)}
            rows={geography.areaClassifications}
            rowId={(row) => row.id}
            emptyTitle={t("noAreaClassifications")}
          />
        </ReferencePane>
      )}

      {/* PDS Areas View */}
      {reference === "pds-areas" && (
        <ReferencePane
          title={t("pdsTitle")}
          description={t("pdsDesc")}
          count={geography.pdsAreas.length}
          actions={canManage ? (
            <Button size="sm" onClick={() => setIsAddPdsOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> {t("addPdsArea")}
            </Button>
          ) : null}
        >
          <ReferenceTable
            key={reference}
            columns={pdsAreaColumns(t)}
            rows={geography.pdsAreas}
            rowId={(row) => row.id}
            emptyTitle={t("noPdsAreas")}
            searchPlaceholder={t("searchPdsAreas")}
          />
        </ReferencePane>
      )}

      {/* Add Subcontractor Dialog */}
      <Dialog open={isAddSubOpen} onOpenChange={setIsAddSubOpen}>
        <DialogContent>
          <form onSubmit={handleCreateSub}>
            <DialogHeader>
              <DialogTitle>{t("dialogs.addSubcontractorTitle")}</DialogTitle>
              <DialogDescription>{t("dialogs.addSubcontractorDesc")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-3">
              <div className="space-y-1.5">
                <Label htmlFor="sub-code">{t("columns.code")}</Label>
                <Input
                  id="sub-code"
                  placeholder={t("dialogs.subCodePlaceholder")}
                  value={subCode}
                  onChange={(e) => setSubCode(e.target.value)}
                  disabled={isSubmittingSub}
                />
                {subErrors.code && <p className="text-xs text-destructive">{subErrors.code}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sub-desc">{t("dialogs.subDescLabel")}</Label>
                <Input
                  id="sub-desc"
                  placeholder={t("dialogs.subDescPlaceholder")}
                  value={subDesc}
                  onChange={(e) => setSubDesc(e.target.value)}
                  disabled={isSubmittingSub}
                />
                {subErrors.description && <p className="text-xs text-destructive">{subErrors.description}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sub-contact">{t("dialogs.contactDetailsOptional")}</Label>
                <Input
                  id="sub-contact"
                  placeholder={t("dialogs.contactDetailsPlaceholder")}
                  value={subContact}
                  onChange={(e) => setSubContact(e.target.value)}
                  disabled={isSubmittingSub}
                />
              </div>
            </div>
            <DialogFooter>
              <AddAnotherToggle id="subcontractor-add-another" checked={addAnother} onCheckedChange={setAddAnother} />
              <Button variant="outline" type="button" onClick={() => setIsAddSubOpen(false)} disabled={isSubmittingSub}>
                {t("dialogs.cancel")}
              </Button>
              <Button type="submit" disabled={isSubmittingSub}>
                {t("dialogs.addSubcontractorTitle")}
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
              <DialogTitle>{t("dialogs.addUnitTitle")}</DialogTitle>
              <DialogDescription>{t("dialogs.addUnitDesc")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-3">
              <div className="space-y-1.5">
                <Label htmlFor="unit-code">{t("columns.code")}</Label>
                <Input
                  id="unit-code"
                  placeholder={t("dialogs.unitCodePlaceholder")}
                  value={unitCode}
                  onChange={(e) => setUnitCode(e.target.value)}
                  disabled={isSubmittingUnit}
                />
                {unitErrors.code && <p className="text-xs text-destructive">{unitErrors.code}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="unit-desc">{t("columns.description")}</Label>
                <Input
                  id="unit-desc"
                  placeholder={t("dialogs.unitDescPlaceholder")}
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
              <AddAnotherToggle id="unit-add-another" checked={addAnother} onCheckedChange={setAddAnother} />
              <Button
                variant="outline"
                type="button"
                onClick={() => setIsAddUnitOpen(false)}
                disabled={isSubmittingUnit}
              >
                {t("dialogs.cancel")}
              </Button>
              <Button type="submit" disabled={isSubmittingUnit}>
                {t("dialogs.addUnitTitle")}
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
              <DialogTitle>{t("dialogs.addAreaClassificationTitle")}</DialogTitle>
              <DialogDescription>
                {t("dialogs.addAreaClassificationDesc")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-3">
              <div className="space-y-1.5">
                <Label htmlFor="ac-code">{t("columns.code")}</Label>
                <Input
                  id="ac-code"
                  placeholder={t("dialogs.acCodePlaceholder")}
                  value={acCode}
                  onChange={(e) => setAcCode(e.target.value)}
                  disabled={isSubmittingAc}
                />
                {acErrors.code && <p className="text-xs text-destructive">{acErrors.code}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ac-desc">{t("columns.description")}</Label>
                <Input
                  id="ac-desc"
                  placeholder={t("dialogs.acDescPlaceholder")}
                  value={acDesc}
                  onChange={(e) => setAcDesc(e.target.value)}
                  disabled={isSubmittingAc}
                />
                {acErrors.description && (
                  <p className="text-xs text-destructive">{acErrors.description}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>{t("dialogs.unitLabel")}</Label>
                <Select value={acUnitId} onValueChange={setAcUnitId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("dialogs.selectUnit")} />
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
              <AddAnotherToggle id="area-classification-add-another" checked={addAnother} onCheckedChange={setAddAnother} />
              <Button
                variant="outline"
                type="button"
                onClick={() => setIsAddAcOpen(false)}
                disabled={isSubmittingAc}
              >
                {t("dialogs.cancel")}
              </Button>
              <Button type="submit" disabled={isSubmittingAc}>
                {t("dialogs.addAreaClassificationTitle")}
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
              <DialogTitle>{t("dialogs.addPdsTitle")}</DialogTitle>
              <DialogDescription>{t("dialogs.addPdsDesc")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-3 max-h-[60vh] overflow-y-auto pr-1">
              {pdsErrors.subcontractors && (
                <div className="p-2 rounded bg-destructive/10 text-destructive text-xs">
                  {pdsErrors.subcontractors}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="pds-code">{t("columns.code")}</Label>
                  <Input
                    id="pds-code"
                    placeholder={t("dialogs.pdsCodePlaceholder")}
                    value={pdsCode}
                    onChange={(e) => setPdsCode(e.target.value)}
                    disabled={isSubmittingPds}
                  />
                  {pdsErrors.code && <p className="text-xs text-destructive">{pdsErrors.code}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pds-desc">{t("columns.description")}</Label>
                  <Input
                    id="pds-desc"
                    placeholder={t("dialogs.pdsDescPlaceholder")}
                    value={pdsDesc}
                    onChange={(e) => setPdsDesc(e.target.value)}
                    disabled={isSubmittingPds}
                  />
                  {pdsErrors.description && <p className="text-xs text-destructive">{pdsErrors.description}</p>}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>{t("dialogs.shopSubcontractor")}</Label>
                <Select value={shopSubId} onValueChange={setShopSubId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("dialogs.selectShopSubcontractor")} />
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
                <Label>{t("dialogs.assemblySubcontractor")}</Label>
                <Select value={assemblySubId} onValueChange={setAssemblySubId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("dialogs.selectAssemblySubcontractor")} />
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
                <Label>{t("dialogs.fieldSubcontractor")}</Label>
                <Select value={fieldSubId} onValueChange={setFieldSubId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("dialogs.selectFieldSubcontractor")} />
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
                <Label>{t("dialogs.areaClassification")}</Label>
                <Select value={areaClassId} onValueChange={setAreaClassId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("dialogs.selectAreaClassification")} />
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
                <Label>{t("dialogs.environment")}</Label>
                <Select
                  value={env}
                  onValueChange={(value) => setEnv(value as "above_ground" | "underground")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="above_ground">{t("dialogs.aboveGround")}</SelectItem>
                    <SelectItem value="underground">{t("dialogs.underground")}</SelectItem>
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
                    {t("dialogs.isProcessUnit")}
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
                    {t("dialogs.isPipeRack")}
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
                    placeholder={t("dialogs.enterCustom", { name: field.label })}
                  />
                </div>
              ))}
            </div>
            <DialogFooter>
              <AddAnotherToggle id="pds-area-add-another" checked={addAnother} onCheckedChange={setAddAnother} />
              <Button variant="outline" type="button" onClick={() => setIsAddPdsOpen(false)} disabled={isSubmittingPds}>
                {t("dialogs.cancel")}
              </Button>
              <Button type="submit" disabled={isSubmittingPds}>
                {t("dialogs.addPdsTitle")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
