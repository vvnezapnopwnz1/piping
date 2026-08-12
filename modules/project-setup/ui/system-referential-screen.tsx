"use client"

import { useCallback, useEffect, useRef, useState } from "react"
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
        setError(err.message || "Failed to load system referentials")
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    fetchReferentials()
  }, [fetchReferentials])

  const handleAddMaterialType = async (e: React.FormEvent) => {
    e.preventDefault()
    const validation = validateReferenceIdentity({ code: addCode, description: addDescription })
    if (!validation.ok) {
      setAddErrors(validation.errors)
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
      toast.success(`Material type "${newEntry.code}" added successfully`)
    } catch (err: any) {
      toast.error(err.message || "Failed to add material type")
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
      setTorquingErrors(validation.errors)
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
      toast.success(`Torquing requirement "${entry.code}" added successfully`)
    } catch (err: any) {
      toast.error(err.message || "Failed to add torquing requirement")
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
      setUtErrors(validation.errors)
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
      toast.success("UT calculation rule added successfully")
    } catch (err: any) {
      toast.error(err.message || "Failed to add UT calculation rule")
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
      setEditErrors(validation.errors)
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
      toast.success(`Material type "${updated.code}" updated successfully`)
    } catch (err: any) {
      toast.error(err.message || "Failed to update material type")
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
      toast.success(`Material type "${updated.code}" set to ${nextStatus}`)
    } catch (err: any) {
      toast.error(err.message || "Failed to update status")
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
            <RefreshCw className="mr-2 h-4 w-4" /> Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  const canManage = data?.canManage ?? false

  return (
    <div className="space-y-6">
      {!canManage && (
        <div className="flex items-center gap-2 rounded-md bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400 border border-amber-500/20">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          <span>Platform administrator rights are required to manage System Referentials. Read-only mode active.</span>
        </div>
      )}

      {/* Material Types */}
      <Card>
        <CardHeader>
          <CardTitle>Material Types</CardTitle>
          <CardDescription>Global material classification list used across all projects.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {canManage && (
            <form onSubmit={handleAddMaterialType} className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="space-y-1.5 flex-1">
                <Label htmlFor="code">Code</Label>
                <Input
                  id="code"
                  placeholder="e.g. CS"
                  value={addCode}
                  onChange={(e) => setAddCode(e.target.value)}
                  disabled={isAdding}
                />
                {addErrors.code && <p className="text-xs text-destructive">{addErrors.code}</p>}
              </div>
              <div className="space-y-1.5 flex-[2]">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="e.g. Carbon Steel"
                  value={addDescription}
                  onChange={(e) => setAddDescription(e.target.value)}
                  disabled={isAdding}
                />
                {addErrors.description && <p className="text-xs text-destructive">{addErrors.description}</p>}
              </div>
              <Button type="submit" disabled={isAdding}>
                <Plus className="mr-2 h-4 w-4" /> Add Material Type
              </Button>
            </form>
          )}

          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b text-left">
                <tr>
                  <th className="p-3 font-medium">Code</th>
                  <th className="p-3 font-medium">Description</th>
                  <th className="p-3 font-medium">Status</th>
                  {canManage && <th className="p-3 font-medium text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y">
                {(data?.materialTypes ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={canManage ? 4 : 3} className="p-4 text-center text-muted-foreground">
                      No material types found.
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
                                <Edit2 className="mr-2 h-4 w-4" /> Edit
                              </DropdownMenuItem>
                              {getReferenceStatusActions(entry.status).map((action) => (
                                <DropdownMenuItem
                                  key={action}
                                  onClick={() => handleStatusAction(entry, action)}
                                >
                                  {action === "deactivate"
                                    ? "Deactivate"
                                    : action === "archive"
                                    ? "Archive"
                                    : "Reactivate"}
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
            <CardTitle>Film Quantity Rules</CardTitle>
            <CardDescription>System-wide radiography film count rules (read-only).</CardDescription>
          </div>
          <Badge variant="outline">System Rule</Badge>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b text-left">
                <tr>
                  <th className="p-3 font-medium">Diameter Range (in)</th>
                  <th className="p-3 font-medium">Thickness Range (mm)</th>
                  <th className="p-3 font-medium">Film Count</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(data?.filmQuantityRules ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-4 text-center text-muted-foreground">
                      No film quantity rules configured.
                    </td>
                  </tr>
                ) : (
                  (data?.filmQuantityRules ?? []).map((rule) => (
                    <tr key={rule.id}>
                      <td className="p-3 font-mono">{rule.diameterFromInch}&quot; – {rule.diameterToInch}&quot;</td>
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
            <CardTitle>UT Calculation Rules</CardTitle>
            <CardDescription>System-wide ultrasonic thickness assessment rules.</CardDescription>
          </div>
          <Badge variant="outline">System Rule</Badge>
        </CardHeader>
        <CardContent>
          {canManage && (
            <form onSubmit={handleAddUtCalculationRule} className="mb-4 grid gap-3 rounded-md border p-3 md:grid-cols-5">
              <div className="space-y-1.5">
                <Label htmlFor="ut-diameter-from">Diameter from (in)</Label>
                <Input id="ut-diameter-from" type="number" step="0.001" value={utDiameterFrom} onChange={(e) => setUtDiameterFrom(e.target.value)} disabled={isAddingUt} />
                {utErrors.diameterFromInch && <p className="text-xs text-destructive">{utErrors.diameterFromInch}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ut-diameter-to">Diameter to (in)</Label>
                <Input id="ut-diameter-to" type="number" step="0.001" value={utDiameterTo} onChange={(e) => setUtDiameterTo(e.target.value)} disabled={isAddingUt} />
                {utErrors.diameterToInch && <p className="text-xs text-destructive">{utErrors.diameterToInch}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ut-flange-rating">Flange rating (optional)</Label>
                <Input id="ut-flange-rating" placeholder="e.g. 150#" value={utFlangeRating} onChange={(e) => setUtFlangeRating(e.target.value)} disabled={isAddingUt} />
                {utErrors.flangeRating && <p className="text-xs text-destructive">{utErrors.flangeRating}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ut-coefficient-diameter">Diameter coefficient</Label>
                <Input id="ut-coefficient-diameter" type="number" step="0.001" value={utCoefficientDiameter} onChange={(e) => setUtCoefficientDiameter(e.target.value)} disabled={isAddingUt} />
                {utErrors.coefficientDiameter && <p className="text-xs text-destructive">{utErrors.coefficientDiameter}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ut-coefficient-rating">Rating coefficient</Label>
                <Input id="ut-coefficient-rating" type="number" step="0.001" value={utCoefficientRating} onChange={(e) => setUtCoefficientRating(e.target.value)} disabled={isAddingUt} />
                {utErrors.coefficientRating && <p className="text-xs text-destructive">{utErrors.coefficientRating}</p>}
                <Button type="submit" className="w-full" disabled={isAddingUt}>{isAddingUt ? "Adding…" : "Add UT Calculation Rule"}</Button>
              </div>
            </form>
          )}
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b text-left">
                <tr>
                  <th className="p-3 font-medium">Diameter Range (in)</th>
                  <th className="p-3 font-medium">Flange Rating</th>
                  <th className="p-3 font-medium">Coeff. Diameter</th>
                  <th className="p-3 font-medium">Coeff. Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(data?.utCalculationRules ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-muted-foreground">
                      No UT calculation rules configured.
                    </td>
                  </tr>
                ) : (
                  (data?.utCalculationRules ?? []).map((rule) => (
                    <tr key={rule.id}>
                      <td className="p-3 font-mono">{rule.diameterFromInch}&quot; – {rule.diameterToInch}&quot;</td>
                      <td className="p-3 font-mono">{rule.flangeRating || "Any"}</td>
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
            <CardTitle>Torquing Requirements</CardTitle>
            <CardDescription>System-wide jointing methods used by Flange Management.</CardDescription>
          </div>
          <Badge variant="outline">System Standard</Badge>
        </CardHeader>
        <CardContent>
          {canManage && (
            <form onSubmit={handleAddTorquingRequirement} className="mb-4 flex flex-col items-end gap-3 rounded-md border p-3 sm:flex-row">
              <div className="w-full space-y-1.5 sm:flex-1">
                <Label htmlFor="torquing-code">Code</Label>
                <Input id="torquing-code" placeholder="e.g. TORQUE-MANUAL" value={torquingCode} onChange={(e) => setTorquingCode(e.target.value)} disabled={isAddingTorquing} />
                {torquingErrors.code && <p className="text-xs text-destructive">{torquingErrors.code}</p>}
              </div>
              <div className="w-full space-y-1.5 sm:flex-[2]">
                <Label htmlFor="torquing-description">Description</Label>
                <Input id="torquing-description" placeholder="Manual torqueing" value={torquingDescription} onChange={(e) => setTorquingDescription(e.target.value)} disabled={isAddingTorquing} />
                {torquingErrors.description && <p className="text-xs text-destructive">{torquingErrors.description}</p>}
              </div>
              <Button type="submit" disabled={isAddingTorquing}>{isAddingTorquing ? "Adding…" : "Add Torquing Requirement"}</Button>
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
            <DialogTitle>Edit Material Type</DialogTitle>
            <DialogDescription>Modify material type code or description.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-code">Code</Label>
              <Input
                id="edit-code"
                value={editCode}
                onChange={(e) => setEditCode(e.target.value)}
                disabled={isUpdating}
              />
              {editErrors.code && <p className="text-xs text-destructive">{editErrors.code}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-desc">Description</Label>
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
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={isUpdating}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
