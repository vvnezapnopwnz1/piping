"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { AlertCircle, Edit2, MoreHorizontal, Plus, RefreshCw, ShieldAlert, Trash2 } from "lucide-react"
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
import { cn } from "@/lib/utils"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import {
  SYSTEM_REFERENCE_SECTIONS,
  toSystemReferentialSection,
  validateMaterialType,
  type SystemReferenceEntry,
  type SystemReferentialSectionKey,
} from "@/lib/system-referentials"
import {
  loadSystemReferentials,
  createMaterialType,
  updateMaterialType,
  setMaterialTypeStatus,
  deleteMaterialType,
} from "@/lib/supabase/system-referentials"

const SECTION_DESCRIPTIONS: Record<SystemReferentialSectionKey, string> = {
  materialTypes: "Global material classification list.",
  filmQty: "System-wide radiography film count rules.",
  utCalc: "System-wide ultrasonic thickness assessment formula references.",
  torquing: "System-wide bolting torque requirement specifications.",
}

export function SupabaseSystemReferentialView() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [entries, setEntries] = useState<SystemReferenceEntry[]>([])
  const [canManage, setCanManage] = useState(false)

  // Add form state
  const [addCode, setAddCode] = useState("")
  const [addDescription, setAddDescription] = useState("")
  const [addErrors, setAddErrors] = useState<{ code?: string; description?: string }>({})
  const [isAdding, setIsAdding] = useState(false)

  // Edit dialog state
  const [editingEntry, setEditingEntry] = useState<SystemReferenceEntry | null>(null)
  const [editCode, setEditCode] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editErrors, setEditErrors] = useState<{ code?: string; description?: string }>({})
  const [isUpdating, setIsUpdating] = useState(false)

  // Delete dialog state
  const [deletingEntry, setDeletingEntry] = useState<SystemReferenceEntry | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Status toggle state tracker (entry ID in flight)
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
        setEntries(result.entries)
        setCanManage(result.canManage)
        setLoading(false)
      }
    } catch {
      if (currentVersion === requestVersionRef.current) {
        setError("Unable to load system referentials. Please try again.")
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    void fetchReferentials()
  }, [fetchReferentials])

  // Group entries by section
  const sectionEntriesMap = useMemo(() => {
    const map: Record<SystemReferentialSectionKey, SystemReferenceEntry[]> = {
      materialTypes: [],
      filmQty: [],
      utCalc: [],
      torquing: [],
    }

    for (const entry of entries) {
      const secKey = toSystemReferentialSection(entry.kind)
      if (map[secKey]) {
        map[secKey].push(entry)
      }
    }

    return map
  }, [entries])

  // Material Type Add Handler
  const handleAddMaterialType = async () => {
    const validation = validateMaterialType({
      code: addCode,
      description: addDescription,
    })

    if (!validation.isValid) {
      setAddErrors(validation.errors)
      return
    }

    setAddErrors({})
    setIsAdding(true)

    try {
      const client = getSupabaseBrowserClient()
      const created = await createMaterialType(client, validation.value)

      setEntries((prev) => [...prev, created])
      setAddCode("")
      setAddDescription("")
      toast.success(`Material type ${created.code} added successfully`)
    } catch {
      toast.error("Unable to save material type")
    } finally {
      setIsAdding(false)
    }
  }

  // Material Type Edit Open
  const handleOpenEdit = (entry: SystemReferenceEntry) => {
    setEditingEntry(entry)
    setEditCode(entry.code)
    setEditDescription(entry.description)
    setEditErrors({})
  }

  // Material Type Edit Save
  const handleSaveEdit = async () => {
    if (!editingEntry) return

    const validation = validateMaterialType({
      code: editCode,
      description: editDescription,
    })

    if (!validation.isValid) {
      setEditErrors(validation.errors)
      return
    }

    setEditErrors({})
    setIsUpdating(true)

    try {
      const client = getSupabaseBrowserClient()
      const updated = await updateMaterialType(client, editingEntry.id, validation.value)

      setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))
      setEditingEntry(null)
      toast.success(`Material type ${updated.code} updated`)
    } catch {
      toast.error("Unable to save material type")
    } finally {
      setIsUpdating(false)
    }
  }

  // Material Type Status Toggle
  const handleToggleStatus = async (entry: SystemReferenceEntry) => {
    const nextStatus = entry.active ? "inactive" : "active"
    setStatusInFlightId(entry.id)

    try {
      const client = getSupabaseBrowserClient()
      const updated = await setMaterialTypeStatus(client, entry.id, nextStatus)

      setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))
      toast.success(
        `Material type ${entry.code} ${nextStatus === "active" ? "reactivated" : "deactivated"}`
      )
    } catch {
      toast.error("Unable to update material type status")
    } finally {
      setStatusInFlightId(null)
    }
  }

  // Material Type Delete Confirm
  const handleConfirmDelete = async () => {
    if (!deletingEntry) return

    setIsDeleting(true)
    try {
      const client = getSupabaseBrowserClient()
      await deleteMaterialType(client, deletingEntry.id)

      setEntries((prev) => prev.filter((e) => e.id !== deletingEntry.id))
      toast.success(`Material type ${deletingEntry.code} deleted`)
      setDeletingEntry(null)
    } catch {
      toast.error("Unable to delete material type")
    } finally {
      setIsDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Card className="border-slate-200">
          <CardHeader className="space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-96" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50/50">
        <CardHeader>
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <CardTitle className="text-base font-semibold">
              Error Loading Referentials
            </CardTitle>
          </div>
          <CardDescription className="text-red-600">{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchReferentials}
            className="gap-2 border-red-200 text-red-700 hover:bg-red-100"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  const sectionsList: SystemReferentialSectionKey[] = [
    "materialTypes",
    "filmQty",
    "utCalc",
    "torquing",
  ]

  return (
    <div className="space-y-4">
      {!canManage && (
        <div className="flex items-center gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600" />
          <span>
            Read-only view. Platform Administrator access is required to add, edit, or modify Material Types.
          </span>
        </div>
      )}

      {sectionsList.map((secKey) => {
        const secConfig = SYSTEM_REFERENCE_SECTIONS[secKey]
        const secEntries = sectionEntriesMap[secKey] || []
        const activeCount = secEntries.filter((e) => e.active).length
        const isMutableSection = secConfig.mutable && canManage

        return (
          <Card key={secKey} className="border-slate-200">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base">{secConfig.title}</CardTitle>
                  <CardDescription>{SECTION_DESCRIPTIONS[secKey]}</CardDescription>
                </div>
                <Badge variant="outline" className="shrink-0 text-[10px]">
                  {activeCount} / {secEntries.length}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                <div className="overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr className="border-b border-slate-200">
                        <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                          Code
                        </th>
                        <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                          Description
                        </th>
                        <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                          Status
                        </th>
                        {isMutableSection && (
                          <th className="w-10 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                            Actions
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {secEntries.length === 0 && (
                        <tr>
                          <td
                            colSpan={isMutableSection ? 4 : 3}
                            className="px-3 py-6 text-center text-xs text-slate-500"
                          >
                            {isMutableSection
                              ? "No entries yet. Add the first material type below."
                              : "No records found."}
                          </td>
                        </tr>
                      )}
                      {secEntries.map((entry, i) => (
                        <tr
                          key={entry.id}
                          className={cn(
                            "border-b border-slate-100",
                            i % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                          )}
                        >
                          <td className="whitespace-nowrap px-3 py-1.5 font-mono text-xs text-slate-700">
                            {entry.code}
                          </td>
                          <td className="px-3 py-1.5 text-xs text-slate-700">
                            {entry.description}
                          </td>
                          <td className="whitespace-nowrap px-3 py-1.5">
                            {entry.active ? (
                              <Badge
                                variant="outline"
                                className="border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700"
                              >
                                Active
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="border-slate-300 bg-slate-100 text-[10px] text-slate-600"
                              >
                                Inactive
                              </Badge>
                            )}
                          </td>
                          {isMutableSection && (
                            <td className="whitespace-nowrap px-3 py-1.5">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    disabled={statusInFlightId === entry.id}
                                  >
                                    <MoreHorizontal className="h-3.5 w-3.5 text-slate-500" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => handleOpenEdit(entry)}
                                    className="gap-2"
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleToggleStatus(entry)}
                                  >
                                    {entry.active ? "Deactivate" : "Reactivate"}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => setDeletingEntry(entry)}
                                    className="gap-2 text-red-600 focus:text-red-600"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {isMutableSection && (
                <div className="space-y-1 pt-1">
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <div className="sm:w-32">
                      <Input
                        value={addCode}
                        onChange={(e) => {
                          setAddCode(e.target.value)
                          if (addErrors.code) setAddErrors((prev) => ({ ...prev, code: undefined }))
                        }}
                        placeholder="e.g. CS"
                        className={cn("h-8 text-xs", addErrors.code && "border-red-500")}
                      />
                    </div>
                    <div className="flex-1">
                      <Input
                        value={addDescription}
                        onChange={(e) => {
                          setAddDescription(e.target.value)
                          if (addErrors.description)
                            setAddErrors((prev) => ({ ...prev, description: undefined }))
                        }}
                        placeholder="e.g. Carbon Steel"
                        className={cn("h-8 text-xs", addErrors.description && "border-red-500")}
                      />
                    </div>
                    <Button
                      size="sm"
                      onClick={handleAddMaterialType}
                      disabled={isAdding || !addCode.trim() || !addDescription.trim()}
                      className="gap-1"
                    >
                      {isAdding ? (
                        <>
                          <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          Adding…
                        </>
                      ) : (
                        <>
                          <Plus className="h-3.5 w-3.5" />
                          Add row
                        </>
                      )}
                    </Button>
                  </div>
                  {(addErrors.code || addErrors.description) && (
                    <div className="text-[11px] text-red-500">
                      {addErrors.code || addErrors.description}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}

      {/* Edit Material Type Dialog */}
      <Dialog open={!!editingEntry} onOpenChange={(open) => !open && setEditingEntry(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Edit Material Type</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Update code and description for material type.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-medium">Code</Label>
              <Input
                value={editCode}
                onChange={(e) => {
                  setEditCode(e.target.value)
                  if (editErrors.code) setEditErrors((prev) => ({ ...prev, code: undefined }))
                }}
                placeholder="e.g. CS"
                className={cn("h-8 text-xs", editErrors.code && "border-red-500")}
              />
              {editErrors.code && (
                <p className="text-[11px] text-red-500">{editErrors.code}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Description</Label>
              <Input
                value={editDescription}
                onChange={(e) => {
                  setEditDescription(e.target.value)
                  if (editErrors.description)
                    setEditErrors((prev) => ({ ...prev, description: undefined }))
                }}
                placeholder="e.g. Carbon Steel"
                className={cn("h-8 text-xs", editErrors.description && "border-red-500")}
              />
              {editErrors.description && (
                <p className="text-[11px] text-red-500">{editErrors.description}</p>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingEntry(null)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveEdit} disabled={isUpdating}>
              {isUpdating ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingEntry} onOpenChange={(open) => !open && setDeletingEntry(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base text-red-600">Delete Material Type</DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Are you sure you want to delete material type{" "}
              <strong className="font-mono text-slate-800">{deletingEntry?.code}</strong>? This
              action cannot be undone if no projects reference this material type.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeletingEntry(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
