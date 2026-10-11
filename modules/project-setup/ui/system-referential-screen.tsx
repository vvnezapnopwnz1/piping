// modules/project-setup/ui/system-referential-screen.tsx
"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { AlertCircle, Edit2, MoreHorizontal, Plus, RefreshCw, ShieldAlert } from "lucide-react"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import {
  loadSystemReferentials,
  createMaterialType,
  createTorquingRequirement,
  createUtCalculationRule,
  updateMaterialType,
  setMaterialTypeStatus,
  type LoadedSystemReferentials,
} from "../infrastructure/supabase-system-referential-repository"
import {
  validateTorquingRequirementInput,
  validateUtCalculationRuleInput,
  type FilmQuantityRule,
  type SystemReferenceEntry,
  type UtCalculationRule,
} from "../domain/system-referential"
import { validateReferenceIdentity, getReferenceStatusActions } from "../domain/reference"
import { formatFieldErrors } from "./setup-field-issue"
import { ReferenceStatusBadge } from "./reference-status-badge"
import { ReferencePane, ReferenceTable } from "./reference-pane"
import { AddAnotherToggle } from "./add-another-toggle"
import {
  SystemReferenceNavigator,
  parseSystemReferenceKey,
  type SystemReferenceKey,
} from "./system-reference-navigator"

type SysT = ReturnType<typeof useTranslations<"projectSetup.systemReferential">>

function materialTypeColumns(
  t: SysT,
  canManage: boolean,
  statusInFlightId: string | null,
  onOpenEdit: (entry: SystemReferenceEntry) => void,
  onStatusAction: (entry: SystemReferenceEntry, action: "deactivate" | "archive" | "reactivate") => void,
): ReadonlyArray<DataColumn<SystemReferenceEntry>> {
  const cols: DataColumn<SystemReferenceEntry>[] = [
    {
      id: "code",
      header: t("columns.code"),
      value: (row) => row.code,
      searchable: true,
      alwaysVisible: true,
      className: "font-mono font-medium",
    },
    {
      id: "description",
      header: t("columns.description"),
      value: (row) => row.description,
      searchable: true,
    },
    {
      id: "status",
      header: t("columns.status"),
      value: (row) => row.status,
      cell: (row) => <ReferenceStatusBadge status={row.status} />,
    },
  ]

  if (canManage) {
    cols.push({
      id: "actions",
      header: t("columns.actions"),
      sortable: false,
      value: () => "",
      className: "text-right",
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              disabled={statusInFlightId === row.id}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onOpenEdit(row)}>
              <Edit2 className="mr-2 h-4 w-4" /> {t("edit")}
            </DropdownMenuItem>
            {getReferenceStatusActions(row.status).map((action) => (
              <DropdownMenuItem
                key={action}
                onClick={() => onStatusAction(row, action)}
              >
                {action === "deactivate"
                  ? t("actions.deactivate")
                  : action === "archive"
                  ? t("actions.archive")
                  : t("actions.reactivate")}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    })
  }

  return cols
}

function torquingColumns(t: SysT): ReadonlyArray<DataColumn<SystemReferenceEntry>> {
  return [
    {
      id: "code",
      header: t("columns.code"),
      value: (row) => row.code,
      searchable: true,
      alwaysVisible: true,
      className: "font-mono font-medium",
    },
    {
      id: "description",
      header: t("columns.description"),
      value: (row) => row.description,
      searchable: true,
    },
    {
      id: "status",
      header: t("columns.status"),
      value: (row) => row.status,
      cell: (row) => <ReferenceStatusBadge status={row.status} />,
    },
  ]
}

function filmQuantityColumns(t: SysT): ReadonlyArray<DataColumn<FilmQuantityRule>> {
  return [
    {
      id: "diameterRangeIn",
      header: t("columns.diameterRangeIn"),
      value: (row) => row.diameterFromInch,
      cell: (row) => `${row.diameterFromInch}" – ${row.diameterToInch}"`,
      className: "font-mono",
    },
    {
      id: "thicknessRangeMm",
      header: t("columns.thicknessRangeMm"),
      value: (row) => row.thicknessFromMm,
      cell: (row) => `${row.thicknessFromMm} – ${row.thicknessToMm}`,
      className: "font-mono",
    },
    {
      id: "filmCount",
      header: t("columns.filmCount"),
      value: (row) => row.filmCount,
      numeric: true,
      className: "font-mono font-medium",
    },
  ]
}

function utCalculationColumns(t: SysT): ReadonlyArray<DataColumn<UtCalculationRule>> {
  return [
    {
      id: "diameterRangeIn",
      header: t("columns.diameterRangeIn"),
      value: (row) => row.diameterFromInch,
      cell: (row) => `${row.diameterFromInch}" – ${row.diameterToInch}"`,
      className: "font-mono",
    },
    {
      id: "flangeRating",
      header: t("columns.flangeRating"),
      value: (row) => row.flangeRating || t("anyRating"),
      searchable: true,
      className: "font-mono",
    },
    {
      id: "coeffDiameter",
      header: t("columns.coeffDiameter"),
      value: (row) => row.coefficientDiameter,
      numeric: true,
      className: "font-mono",
    },
    {
      id: "coeffRating",
      header: t("columns.coeffRating"),
      value: (row) => row.coefficientRating,
      numeric: true,
      className: "font-mono",
    },
  ]
}

export function SystemReferentialScreen() {
  const t = useTranslations("projectSetup.systemReferential")
  const tIssues = useTranslations("projectSetup.issues")

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<LoadedSystemReferentials | null>(null)

  // URL state
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const active = parseSystemReferenceKey(searchParams.get("ref"))
  const hrefFor = (key: SystemReferenceKey) => `${pathname}?ref=${key}`

  // Material type add dialog state
  const [isAddMaterialOpen, setIsAddMaterialOpen] = useState(false)
  const [addCode, setAddCode] = useState("")
  const [addDescription, setAddDescription] = useState("")
  const [addErrors, setAddErrors] = useState<{ code?: string; description?: string }>({})
  const [isAdding, setIsAdding] = useState(false)

  // Torquing add dialog state
  const [isAddTorquingOpen, setIsAddTorquingOpen] = useState(false)
  const [torquingCode, setTorquingCode] = useState("")
  const [torquingDescription, setTorquingDescription] = useState("")
  const [torquingErrors, setTorquingErrors] = useState<Record<string, string>>({})
  const [isAddingTorquing, setIsAddingTorquing] = useState(false)

  // UT rule add dialog state
  const [isAddUtOpen, setIsAddUtOpen] = useState(false)
  const [utDiameterFrom, setUtDiameterFrom] = useState("")
  const [utDiameterTo, setUtDiameterTo] = useState("")
  const [utFlangeRating, setUtFlangeRating] = useState("")
  const [utCoefficientDiameter, setUtCoefficientDiameter] = useState("")
  const [utCoefficientRating, setUtCoefficientRating] = useState("")
  const [utErrors, setUtErrors] = useState<Record<string, string>>({})
  const [isAddingUt, setIsAddingUt] = useState(false)
  const [addAnother, setAddAnother] = useState(false)

  // Material type edit dialog state
  const [editingEntry, setEditingEntry] = useState<SystemReferenceEntry | null>(null)
  const [editCode, setEditCode] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editErrors, setEditErrors] = useState<{ code?: string; description?: string }>({})
  const [isUpdating, setIsUpdating] = useState(false)

  // Status toggle in-flight tracker
  const [statusInFlightId, setStatusInFlightId] = useState<string | null>(null)

  const requestVersionRef = useRef(0)

  const fetchReferentials = useCallback(async () => {
    const currentVersion = ++requestVersionRef.current
    setLoading(true)
    setError(null)

    try {
      const client = getSupabaseBrowserClient()
      const result = await loadSystemReferentials(client)

      if (currentVersion === requestVersionRef.current) {
        setData(result)
        setLoading(false)
      }
    } catch (err: any) {
      if (currentVersion === requestVersionRef.current) {
        setError(err.message || t("failedToLoad"))
        setLoading(false)
      }
    }
  }, [t])

  useEffect(() => {
    fetchReferentials()
  }, [fetchReferentials])

  const handleOpenEdit = useCallback((entry: SystemReferenceEntry) => {
    setEditingEntry(entry)
    setEditCode(entry.code)
    setEditDescription(entry.description)
    setEditErrors({})
  }, [])

  const handleStatusAction = useCallback(
    async (
      entry: SystemReferenceEntry,
      action: "deactivate" | "archive" | "reactivate"
    ) => {
      const nextStatus = action === "reactivate" ? "active" : action === "deactivate" ? "inactive" : "archived"
      setStatusInFlightId(entry.id)

      try {
        const client = getSupabaseBrowserClient()
        const updated = await setMaterialTypeStatus(client, entry.id, nextStatus)

        setData((prev) =>
          prev
            ? {
                ...prev,
                materialTypes: prev.materialTypes.map((item) =>
                  item.id === updated.id ? updated : item
                ),
              }
            : null
        )
        toast.success(t("materialTypeStatusSet", { code: updated.code, status: nextStatus }))
      } catch (err: any) {
        toast.error(err.message || t("statusUpdateFailed"))
      } finally {
        setStatusInFlightId(null)
      }
    },
    [t]
  )

  const handleAddMaterialType = async (e: React.FormEvent) => {
    e.preventDefault()
    const validation = validateReferenceIdentity({ code: addCode, description: addDescription })
    if (!validation.ok) {
      setAddErrors(formatFieldErrors(tIssues, validation.errors))
      return
    }

    setAddErrors({})
    setIsAdding(true)

    try {
      const client = getSupabaseBrowserClient()
      const newEntry = await createMaterialType(client, validation.value)
      setData((prev) =>
        prev
          ? {
              ...prev,
              materialTypes: [...prev.materialTypes, newEntry].sort((a, b) =>
                a.code.localeCompare(b.code)
              ),
            }
          : null
      )
      if (!addAnother) setIsAddMaterialOpen(false)
      setAddCode("")
      setAddDescription("")
      toast.success(t("materialTypeAdded", { code: newEntry.code }))
    } catch (err: any) {
      toast.error(err.message || t("materialTypeFailed"))
    } finally {
      setIsAdding(false)
    }
  }

  const handleAddTorquingRequirement = async (e: React.FormEvent) => {
    e.preventDefault()
    const validation = validateTorquingRequirementInput({
      code: torquingCode,
      description: torquingDescription,
    })
    if (!validation.ok) {
      setTorquingErrors(formatFieldErrors(tIssues, validation.errors))
      return
    }

    setTorquingErrors({})
    setIsAddingTorquing(true)
    try {
      const entry = await createTorquingRequirement(getSupabaseBrowserClient(), validation.value)
      setData((prev) =>
        prev
          ? {
              ...prev,
              torquingRequirements: [...prev.torquingRequirements, entry].sort((a, b) =>
                a.code.localeCompare(b.code)
              ),
            }
          : null
      )
      if (!addAnother) setIsAddTorquingOpen(false)
      setTorquingCode("")
      setTorquingDescription("")
      toast.success(t("torquingAdded", { code: entry.code }))
    } catch (err: any) {
      toast.error(err.message || t("torquingFailed"))
    } finally {
      setIsAddingTorquing(false)
    }
  }

  const handleAddUtCalculationRule = async (e: React.FormEvent) => {
    e.preventDefault()
    const validation = validateUtCalculationRuleInput({
      diameterFromInch: Number(utDiameterFrom),
      diameterToInch: Number(utDiameterTo),
      flangeRating: utFlangeRating.trim() || null,
      coefficientDiameter: Number(utCoefficientDiameter),
      coefficientRating: Number(utCoefficientRating),
    })
    if (!validation.ok) {
      setUtErrors(formatFieldErrors(tIssues, validation.errors))
      return
    }

    setUtErrors({})
    setIsAddingUt(true)
    try {
      const rule = await createUtCalculationRule(getSupabaseBrowserClient(), validation.value)
      setData((prev) =>
        prev
          ? {
              ...prev,
              utCalculationRules: [...prev.utCalculationRules, rule].sort(
                (a, b) => a.diameterFromInch - b.diameterFromInch
              ),
            }
          : null
      )
      if (!addAnother) setIsAddUtOpen(false)
      setUtDiameterFrom("")
      setUtDiameterTo("")
      setUtFlangeRating("")
      setUtCoefficientDiameter("")
      setUtCoefficientRating("")
      toast.success(t("utRuleAdded"))
    } catch (err: any) {
      toast.error(err.message || t("utRuleFailed"))
    } finally {
      setIsAddingUt(false)
    }
  }

  const handleSaveEdit = async () => {
    if (!editingEntry) return
    const validation = validateReferenceIdentity({ code: editCode, description: editDescription })
    if (!validation.ok) {
      setEditErrors(formatFieldErrors(tIssues, validation.errors))
      return
    }

    setEditErrors({})
    setIsUpdating(true)

    try {
      const client = getSupabaseBrowserClient()
      const updated = await updateMaterialType(client, editingEntry.id, validation.value)

      setData((prev) =>
        prev
          ? {
              ...prev,
              materialTypes: prev.materialTypes.map((item) =>
                item.id === updated.id ? updated : item
              ),
            }
          : null
      )
      setEditingEntry(null)
      toast.success(t("materialTypeUpdated", { code: updated.code }))
    } catch (err: any) {
      toast.error(err.message || t("materialTypeUpdateFailed"))
    } finally {
      setIsUpdating(false)
    }
  }

  const canManage = data?.canManage ?? false

  const materialCols = useMemo(
    () => materialTypeColumns(t, canManage, statusInFlightId, handleOpenEdit, handleStatusAction),
    [t, canManage, statusInFlightId, handleOpenEdit, handleStatusAction]
  )
  const torquingCols = useMemo(() => torquingColumns(t), [t])
  const filmCols = useMemo(() => filmQuantityColumns(t), [t])
  const utCols = useMemo(() => utCalculationColumns(t), [t])

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-6">
        <div className="flex items-center gap-3 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <p className="font-medium">{error || t("failedToLoad")}</p>
        </div>
        <Button variant="outline" className="mt-4" onClick={fetchReferentials}>
          <RefreshCw className="mr-2 h-4 w-4" /> {t("retry")}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {!canManage && (
        <div className="bg-warning-bg text-warning-fg border-warning-border flex items-center gap-2 rounded-md border p-3 text-sm">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          <span>{t("readOnlyNotice")}</span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <SystemReferenceNavigator active={active} hrefFor={hrefFor} />

        <div className="min-w-0">
          {active === "material-types" && (
            <ReferencePane
              title={t("materialTypesTitle")}
              description={t("materialTypesDesc")}
              count={data.materialTypes.length}
              actions={
                canManage ? (
                  <Button size="sm" onClick={() => setIsAddMaterialOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> {t("addMaterialType")}
                  </Button>
                ) : null
              }
            >
              <ReferenceTable
                key={active}
                columns={materialCols}
                rows={data.materialTypes}
                rowId={(row) => row.id}
                emptyTitle={t("noMaterialTypes")}
              />
            </ReferencePane>
          )}

          {active === "torquing" && (
            <ReferencePane
              title={t("torquingTitle")}
              description={t("torquingDesc")}
              count={data.torquingRequirements.length}
              status={<Badge variant="outline">{t("systemStandardBadge")}</Badge>}
              actions={
                canManage ? (
                  <Button size="sm" onClick={() => setIsAddTorquingOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> {t("addTorquing")}
                  </Button>
                ) : null
              }
            >
              <ReferenceTable
                key={active}
                columns={torquingCols}
                rows={data.torquingRequirements}
                rowId={(row) => row.id}
                emptyTitle={t("noTorquing")}
              />
            </ReferencePane>
          )}

          {active === "film-quantity" && (
            <ReferencePane
              title={t("filmRulesTitle")}
              description={t("filmRulesDesc")}
              count={data.filmQuantityRules.length}
              status={<Badge variant="outline">{t("systemRuleBadge")}</Badge>}
            >
              <ReferenceTable
                key={active}
                columns={filmCols}
                rows={data.filmQuantityRules}
                rowId={(row) => row.id}
                emptyTitle={t("noFilmRules")}
              />
            </ReferencePane>
          )}

          {active === "ut-rules" && (
            <ReferencePane
              title={t("utRulesTitle")}
              description={t("utRulesDesc")}
              count={data.utCalculationRules.length}
              status={<Badge variant="outline">{t("systemRuleBadge")}</Badge>}
              actions={
                canManage ? (
                  <Button size="sm" onClick={() => setIsAddUtOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> {t("addUtRule")}
                  </Button>
                ) : null
              }
            >
              <ReferenceTable
                key={active}
                columns={utCols}
                rows={data.utCalculationRules}
                rowId={(row) => row.id}
                emptyTitle={t("noUtRules")}
              />
            </ReferencePane>
          )}
        </div>
      </div>

      {/* Add Material Type Dialog */}
      <Dialog
        open={isAddMaterialOpen}
        onOpenChange={(open) => {
          setIsAddMaterialOpen(open)
          if (!open) setAddErrors({})
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("addMaterialType")}</DialogTitle>
            <DialogDescription>{t("addMaterialTypeDesc")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddMaterialType} className="space-y-4">
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="material-code">{t("code")}</Label>
                <Input
                  id="material-code"
                  placeholder={t("codePlaceholder")}
                  value={addCode}
                  onChange={(e) => setAddCode(e.target.value)}
                  disabled={isAdding}
                  className="w-full"
                />
                {addErrors.code && <p className="text-xs text-destructive">{addErrors.code}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="material-description">{t("description")}</Label>
                <Input
                  id="material-description"
                  placeholder={t("descPlaceholder")}
                  value={addDescription}
                  onChange={(e) => setAddDescription(e.target.value)}
                  disabled={isAdding}
                  className="w-full"
                />
                {addErrors.description && <p className="text-xs text-destructive">{addErrors.description}</p>}
              </div>
            </div>
            <DialogFooter>
              <AddAnotherToggle
                id="material-add-another"
                checked={addAnother}
                onCheckedChange={setAddAnother}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddMaterialOpen(false)}
                disabled={isAdding}
              >
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={isAdding}>
                {t("create")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Torquing Requirement Dialog */}
      <Dialog
        open={isAddTorquingOpen}
        onOpenChange={(open) => {
          setIsAddTorquingOpen(open)
          if (!open) setTorquingErrors({})
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("addTorquing")}</DialogTitle>
            <DialogDescription>{t("addTorquingDesc")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddTorquingRequirement} className="space-y-4">
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="torquing-code">{t("code")}</Label>
                <Input
                  id="torquing-code"
                  placeholder={t("torquingCodePlaceholder")}
                  value={torquingCode}
                  onChange={(e) => setTorquingCode(e.target.value)}
                  disabled={isAddingTorquing}
                  className="w-full"
                />
                {torquingErrors.code && <p className="text-xs text-destructive">{torquingErrors.code}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="torquing-description">{t("description")}</Label>
                <Input
                  id="torquing-description"
                  placeholder={t("torquingDescPlaceholder")}
                  value={torquingDescription}
                  onChange={(e) => setTorquingDescription(e.target.value)}
                  disabled={isAddingTorquing}
                  className="w-full"
                />
                {torquingErrors.description && <p className="text-xs text-destructive">{torquingErrors.description}</p>}
              </div>
            </div>
            <DialogFooter>
              <AddAnotherToggle
                id="torquing-add-another"
                checked={addAnother}
                onCheckedChange={setAddAnother}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddTorquingOpen(false)}
                disabled={isAddingTorquing}
              >
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={isAddingTorquing}>
                {t("create")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add UT Calculation Rule Dialog */}
      <Dialog
        open={isAddUtOpen}
        onOpenChange={(open) => {
          setIsAddUtOpen(open)
          if (!open) setUtErrors({})
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("addUtRule")}</DialogTitle>
            <DialogDescription>{t("addUtRuleDesc")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddUtCalculationRule} className="space-y-4">
            <div className="grid gap-4 py-2 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="ut-diameter-from">{t("diameterFromIn")}</Label>
                <Input
                  id="ut-diameter-from"
                  type="number"
                  step="0.001"
                  value={utDiameterFrom}
                  onChange={(e) => setUtDiameterFrom(e.target.value)}
                  disabled={isAddingUt}
                  className="w-full"
                />
                {utErrors.diameterFromInch && <p className="text-xs text-destructive">{utErrors.diameterFromInch}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ut-diameter-to">{t("diameterToIn")}</Label>
                <Input
                  id="ut-diameter-to"
                  type="number"
                  step="0.001"
                  value={utDiameterTo}
                  onChange={(e) => setUtDiameterTo(e.target.value)}
                  disabled={isAddingUt}
                  className="w-full"
                />
                {utErrors.diameterToInch && <p className="text-xs text-destructive">{utErrors.diameterToInch}</p>}
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="ut-flange-rating">{t("flangeRatingOptional")}</Label>
                <Input
                  id="ut-flange-rating"
                  placeholder={t("flangeRatingPlaceholder")}
                  value={utFlangeRating}
                  onChange={(e) => setUtFlangeRating(e.target.value)}
                  disabled={isAddingUt}
                  className="w-full"
                />
                {utErrors.flangeRating && <p className="text-xs text-destructive">{utErrors.flangeRating}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ut-coefficient-diameter">{t("diameterCoeff")}</Label>
                <Input
                  id="ut-coefficient-diameter"
                  type="number"
                  step="0.001"
                  value={utCoefficientDiameter}
                  onChange={(e) => setUtCoefficientDiameter(e.target.value)}
                  disabled={isAddingUt}
                  className="w-full"
                />
                {utErrors.coefficientDiameter && <p className="text-xs text-destructive">{utErrors.coefficientDiameter}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ut-coefficient-rating">{t("ratingCoeff")}</Label>
                <Input
                  id="ut-coefficient-rating"
                  type="number"
                  step="0.001"
                  value={utCoefficientRating}
                  onChange={(e) => setUtCoefficientRating(e.target.value)}
                  disabled={isAddingUt}
                  className="w-full"
                />
                {utErrors.coefficientRating && <p className="text-xs text-destructive">{utErrors.coefficientRating}</p>}
              </div>
            </div>
            <DialogFooter>
              <AddAnotherToggle
                id="ut-add-another"
                checked={addAnother}
                onCheckedChange={setAddAnother}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddUtOpen(false)}
                disabled={isAddingUt}
              >
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={isAddingUt}>
                {t("create")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Material Type Dialog */}
      <Dialog open={!!editingEntry} onOpenChange={(open) => !open && setEditingEntry(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("editDialogTitle")}</DialogTitle>
            <DialogDescription>{t("editDialogDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-code">{t("code")}</Label>
              <Input
                id="edit-code"
                value={editCode}
                onChange={(e) => setEditCode(e.target.value)}
                disabled={isUpdating}
                className="w-full"
              />
              {editErrors.code && <p className="text-xs text-destructive">{editErrors.code}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-desc">{t("description")}</Label>
              <Input
                id="edit-desc"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                disabled={isUpdating}
                className="w-full"
              />
              {editErrors.description && (
                <p className="text-xs text-destructive">{editErrors.description}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingEntry(null)}
              disabled={isUpdating}
            >
              {t("cancel")}
            </Button>
            <Button onClick={handleSaveEdit} disabled={isUpdating}>
              {t("saveChanges")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
