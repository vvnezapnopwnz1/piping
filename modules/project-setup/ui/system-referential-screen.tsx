"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { formatFieldErrors } from "./setup-field-issue"

import { AlertCircle, Edit2, MoreHorizontal, Plus, RefreshCw, ShieldAlert } from "lucide-react"
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
  type SystemReferenceEntry,
} from "../domain/system-referential"
import { ReferenceStatusBadge } from "./reference-status-badge"
import { validateReferenceIdentity, getReferenceStatusActions } from "../domain/reference"

export function SystemReferentialScreen() {
  const t = useTranslations("projectSetup.systemReferential")
  const tIssues = useTranslations("projectSetup.issues")

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<LoadedSystemReferentials | null>(null)

  // Add form state
  const [addCode, setAddCode] = useState("")
  const [addDescription, setAddDescription] = useState("")
  const [addErrors, setAddErrors] = useState<{ code?: string; description?: string }>({})
  const [isAdding, setIsAdding] = useState(false)

  // Track 09 prerequisite forms (create-only)
  const [torquingCode, setTorquingCode] = useState("")
  const [torquingDescription, setTorquingDescription] = useState("")
  const [torquingErrors, setTorquingErrors] = useState<Record<string, string>>({})
  const [isAddingTorquing, setIsAddingTorquing] = useState(false)
  const [utDiameterFrom, setUtDiameterFrom] = useState("")
  const [utDiameterTo, setUtDiameterTo] = useState("")
  const [utFlangeRating, setUtFlangeRating] = useState("")
  const [utCoefficientDiameter, setUtCoefficientDiameter] = useState("")
  const [utCoefficientRating, setUtCoefficientRating] = useState("")
  const [utErrors, setUtErrors] = useState<Record<string, string>>({})
  const [isAddingUt, setIsAddingUt] = useState(false)

  // Edit dialog state
  const [editingEntry, setEditingEntry] = useState<SystemReferenceEntry | null>(null)
  const [editCode, setEditCode] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editErrors, setEditErrors] = useState<{ code?: string; description?: string }>({})
  const [isUpdating, setIsUpdating] = useState(false)

  // Status toggle state tracker
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
          ? { ...prev, torquingRequirements: [...prev.torquingRequirements, entry].sort((a, b) => a.code.localeCompare(b.code)) }
          : null,
      )
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
          ? { ...prev, utCalculationRules: [...prev.utCalculationRules, rule].sort((a, b) => a.diameterFromInch - b.diameterFromInch) }
          : null,
      )
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

  const handleOpenEdit = (entry: SystemReferenceEntry) => {
    setEditingEntry(entry)
    setEditCode(entry.code)
    setEditDescription(entry.description)
    setEditErrors({})
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

  const handleStatusAction = async (
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
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <p className="font-medium">{error}</p>
          </div>
          <Button variant="outline" className="mt-4" onClick={fetchReferentials}>
            <RefreshCw className="mr-2 h-4 w-4" /> {t("retry")}
          </Button>
        </CardContent>
      </Card>
    )
  }

  const canManage = data?.canManage ?? false

  return (
    <div className="space-y-6">
      {!canManage && (
        <div className="bg-warning-bg text-warning-fg border-warning-border flex items-center gap-2 rounded-md border p-3 text-sm">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          <span>{t("readOnlyNotice")}</span>
        </div>
      )}

      {/* Material Types */}
      <Card>
        <CardHeader>
          <CardTitle>{t("materialTypesTitle")}</CardTitle>
          <CardDescription>{t("materialTypesDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {canManage && (
            <form onSubmit={handleAddMaterialType} className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="space-y-1.5 flex-1">
                <Label htmlFor="code">{t("code")}</Label>
                <Input
                  id="code"
                  placeholder={t("codePlaceholder")}
                  value={addCode}
                  onChange={(e) => setAddCode(e.target.value)}
                  disabled={isAdding}
                />
                {addErrors.code && <p className="text-xs text-destructive">{addErrors.code}</p>}
              </div>
              <div className="space-y-1.5 flex-[2]">
                <Label htmlFor="description">{t("description")}</Label>
                <Input
                  id="description"
                  placeholder={t("descPlaceholder")}
                  value={addDescription}
                  onChange={(e) => setAddDescription(e.target.value)}
                  disabled={isAdding}
                />
                {addErrors.description && <p className="text-xs text-destructive">{addErrors.description}</p>}
              </div>
              <Button type="submit" disabled={isAdding}>
                <Plus className="mr-2 h-4 w-4" /> {t("addMaterialType")}
              </Button>
            </form>
          )}

          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b text-left">
                <tr>
                  <th className="p-3 font-medium">{t("columns.code")}</th>
                  <th className="p-3 font-medium">{t("columns.description")}</th>
                  <th className="p-3 font-medium">{t("columns.status")}</th>
                  {canManage && <th className="p-3 font-medium text-right">{t("columns.actions")}</th>}
                </tr>
              </thead>
              <tbody className="divide-y">
                {(data?.materialTypes ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={canManage ? 4 : 3} className="p-4 text-center text-muted-foreground">
                      {t("noMaterialTypes")}
                    </td>
                  </tr>
                ) : (
                  (data?.materialTypes ?? []).map((entry) => (
                    <tr key={entry.id}>
                      <td className="p-3 font-mono font-medium">{entry.code}</td>
                      <td className="p-3">{entry.description}</td>
                      <td className="p-3">
                        <ReferenceStatusBadge status={entry.status} />
                      </td>
                      {canManage && (
                        <td className="p-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={statusInFlightId === entry.id}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleOpenEdit(entry)}>
                                <Edit2 className="mr-2 h-4 w-4" /> {t("edit")}
                              </DropdownMenuItem>
                              {getReferenceStatusActions(entry.status).map((action) => (
                                <DropdownMenuItem
                                  key={action}
                                  onClick={() => handleStatusAction(entry, action)}
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
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Film Quantity Rules */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>{t("filmRulesTitle")}</CardTitle>
            <CardDescription>{t("filmRulesDesc")}</CardDescription>
          </div>
          <Badge variant="outline">{t("systemRuleBadge")}</Badge>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b text-left">
                <tr>
                  <th className="p-3 font-medium">{t("columns.diameterRangeIn")}</th>
                  <th className="p-3 font-medium">{t("columns.thicknessRangeMm")}</th>
                  <th className="p-3 font-medium">{t("columns.filmCount")}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(data?.filmQuantityRules ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-4 text-center text-muted-foreground">
                      {t("noFilmRules")}
                    </td>
                  </tr>
                ) : (
                  (data?.filmQuantityRules ?? []).map((rule) => (
                    <tr key={rule.id}>
                      <td className="p-3 font-mono">{`${rule.diameterFromInch}" – ${rule.diameterToInch}"`}</td>
                      <td className="p-3 font-mono">{rule.thicknessFromMm} – {rule.thicknessToMm} mm</td>
                      <td className="p-3 font-mono font-medium">{rule.filmCount}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* UT Calculation Rules */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>{t("utRulesTitle")}</CardTitle>
            <CardDescription>{t("utRulesDesc")}</CardDescription>
          </div>
          <Badge variant="outline">{t("systemRuleBadge")}</Badge>
        </CardHeader>
        <CardContent>
          {canManage && (
            <form onSubmit={handleAddUtCalculationRule} className="mb-4 grid gap-3 rounded-md border p-3 md:grid-cols-5">
              <div className="space-y-1.5">
                <Label htmlFor="ut-diameter-from">{t("diameterFromIn")}</Label>
                <Input id="ut-diameter-from" type="number" step="0.001" value={utDiameterFrom} onChange={(e) => setUtDiameterFrom(e.target.value)} disabled={isAddingUt} />
                {utErrors.diameterFromInch && <p className="text-xs text-destructive">{utErrors.diameterFromInch}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ut-diameter-to">{t("diameterToIn")}</Label>
                <Input id="ut-diameter-to" type="number" step="0.001" value={utDiameterTo} onChange={(e) => setUtDiameterTo(e.target.value)} disabled={isAddingUt} />
                {utErrors.diameterToInch && <p className="text-xs text-destructive">{utErrors.diameterToInch}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ut-flange-rating">{t("flangeRatingOptional")}</Label>
                <Input id="ut-flange-rating" placeholder="e.g. 150#" value={utFlangeRating} onChange={(e) => setUtFlangeRating(e.target.value)} disabled={isAddingUt} />
                {utErrors.flangeRating && <p className="text-xs text-destructive">{utErrors.flangeRating}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ut-coefficient-diameter">{t("diameterCoeff")}</Label>
                <Input id="ut-coefficient-diameter" type="number" step="0.001" value={utCoefficientDiameter} onChange={(e) => setUtCoefficientDiameter(e.target.value)} disabled={isAddingUt} />
                {utErrors.coefficientDiameter && <p className="text-xs text-destructive">{utErrors.coefficientDiameter}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ut-coefficient-rating">{t("ratingCoeff")}</Label>
                <Input id="ut-coefficient-rating" type="number" step="0.001" value={utCoefficientRating} onChange={(e) => setUtCoefficientRating(e.target.value)} disabled={isAddingUt} />
                {utErrors.coefficientRating && <p className="text-xs text-destructive">{utErrors.coefficientRating}</p>}
                <Button type="submit" className="w-full" loading={isAddingUt}>{t("addUtRule")}</Button>
              </div>
            </form>
          )}
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b text-left">
                <tr>
                  <th className="p-3 font-medium">{t("columns.diameterRangeIn")}</th>
                  <th className="p-3 font-medium">{t("columns.flangeRating")}</th>
                  <th className="p-3 font-medium">{t("columns.coeffDiameter")}</th>
                  <th className="p-3 font-medium">{t("columns.coeffRating")}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(data?.utCalculationRules ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-muted-foreground">
                      {t("noUtRules")}
                    </td>
                  </tr>
                ) : (
                  (data?.utCalculationRules ?? []).map((rule) => (
                    <tr key={rule.id}>
                      <td className="p-3 font-mono">{`${rule.diameterFromInch}" – ${rule.diameterToInch}"`}</td>
                      <td className="p-3 font-mono">{rule.flangeRating || t("anyRating")}</td>
                      <td className="p-3 font-mono">{rule.coefficientDiameter}</td>
                      <td className="p-3 font-mono">{rule.coefficientRating}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Torquing Methods */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>{t("torquingTitle")}</CardTitle>
            <CardDescription>{t("torquingDesc")}</CardDescription>
          </div>
          <Badge variant="outline">{t("systemStandardBadge")}</Badge>
        </CardHeader>
        <CardContent>
          {canManage && (
            <form onSubmit={handleAddTorquingRequirement} className="mb-4 flex flex-col items-end gap-3 rounded-md border p-3 sm:flex-row">
              <div className="w-full space-y-1.5 sm:flex-1">
                <Label htmlFor="torquing-code">{t("code")}</Label>
                <Input id="torquing-code" placeholder={t("torquingCodePlaceholder")} value={torquingCode} onChange={(e) => setTorquingCode(e.target.value)} disabled={isAddingTorquing} />
                {torquingErrors.code && <p className="text-xs text-destructive">{torquingErrors.code}</p>}
              </div>
              <div className="w-full space-y-1.5 sm:flex-[2]">
                <Label htmlFor="torquing-description">{t("description")}</Label>
                <Input id="torquing-description" placeholder={t("torquingDescPlaceholder")} value={torquingDescription} onChange={(e) => setTorquingDescription(e.target.value)} disabled={isAddingTorquing} />
                {torquingErrors.description && <p className="text-xs text-destructive">{torquingErrors.description}</p>}
              </div>
              <Button type="submit" loading={isAddingTorquing}>{t("addTorquing")}</Button>
            </form>
          )}
          <div className="flex flex-wrap gap-2">
            {(data?.torquingRequirements ?? []).map((entry) => (
              <Badge key={entry.id} variant="secondary" className="px-3 py-1 text-sm" title={entry.description}>
                {entry.code}
              </Badge>
            ))}
            {(data?.torquingRequirements ?? []).length === 0 && (data?.torquingMethods ?? []).map((method) => (
              <Badge key={method} variant="secondary" className="px-3 py-1 text-sm">{method}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
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
              />
              {editErrors.description && (
                <p className="text-xs text-destructive">{editErrors.description}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingEntry(null)} disabled={isUpdating}>
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
