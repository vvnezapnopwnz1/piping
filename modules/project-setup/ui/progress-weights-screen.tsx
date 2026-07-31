"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { AlertCircle, AlertTriangle, CheckCircle2, Plus, RefreshCw, Save, ShieldAlert, Trash2 } from "lucide-react"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import {
  loadProgressWeights,
  saveProgressWeightsRpc,
  type LoadedProgressWeights,
} from "../infrastructure/supabase-progress-weights-repository"
import {
  validatePhaseWeights,
  type ProgressWeightPhase,
  type ProgressWeightItem,
} from "../domain/progress-weights"

const PHASE_LABELS: Record<ProgressWeightPhase, string> = {
  prefabrication: "Prefabrication",
  painting: "Painting",
  assembly: "Assembly",
  erection: "Erection",
}

export function ProgressWeightsScreen({ projectId, canManage = true }: { projectId: string; canManage?: boolean }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<LoadedProgressWeights | null>(null)

  const [activePhase, setActivePhase] = useState<ProgressWeightPhase>("prefabrication")
  const [items, setItems] = useState<ProgressWeightItem[]>([])
  const [validationError, setValidationError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const requestVersionRef = useRef(0)

  const fetchWeights = useCallback(async () => {
    const currentVersion = ++requestVersionRef.current
    setLoading(true)
    setError(null)

    try {
      const client = getSupabaseBrowserClient()
      const result = await loadProgressWeights(client, projectId)

      if (currentVersion === requestVersionRef.current) {
        setData(result)
        const phaseItems = result.weightsByPhase[activePhase].map((w) => ({
          activity: w.activity,
          weight: w.weight,
        }))
        setItems(phaseItems)
        setLoading(false)
      }
    } catch (err: any) {
      if (currentVersion === requestVersionRef.current) {
        setError(err.message || "Failed to load progress weights")
        setLoading(false)
      }
    }
  }, [projectId, activePhase])

  useEffect(() => {
    fetchWeights()
  }, [fetchWeights])

  const handlePhaseChange = (newPhase: ProgressWeightPhase) => {
    setActivePhase(newPhase)
    setValidationError(null)
    if (data) {
      const phaseItems = data.weightsByPhase[newPhase].map((w) => ({
        activity: w.activity,
        weight: w.weight,
      }))
      setItems(phaseItems)
    }
  }

  const handleItemChange = (index: number, field: "activity" | "weight", value: any) => {
    setItems((prev) => {
      const copy = [...prev]
      copy[index] = { ...copy[index], [field]: value }
      return copy
    })
  }

  const handleAddItem = () => {
    setItems((prev) => [...prev, { activity: "", weight: 0 }])
  }

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const currentTotal = items.reduce((sum, item) => sum + (Number(item.weight) || 0), 0)
  const isTotalValid = Math.abs(currentTotal - 100) < 0.0001
  const isAssemblyDisabled = activePhase === "assembly" && !data?.assemblyEnabled

  const handleSave = async () => {
    const validation = validatePhaseWeights(activePhase, items, data?.assemblyEnabled ?? false)
    if (!validation.ok) {
      const firstError = Object.values(validation.errors)[0]
      setValidationError(firstError)
      toast.error(firstError)
      return
    }

    setValidationError(null)
    setIsSaving(true)

    try {
      const client = getSupabaseBrowserClient()
      const savedRows = await saveProgressWeightsRpc(client, projectId, activePhase, items)

      setData((prev) =>
        prev
          ? {
              ...prev,
              weightsByPhase: {
                ...prev.weightsByPhase,
                [activePhase]: savedRows,
              },
            }
          : null
      )
      toast.success(`${PHASE_LABELS[activePhase]} progress weights saved successfully`)
    } catch (err: any) {
      toast.error(err.message || "Failed to save progress weights")
    } finally {
      setIsSaving(false)
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
          <Button variant="outline" className="mt-4" onClick={fetchWeights}>
            <RefreshCw className="mr-2 h-4 w-4" /> Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {!canManage && (
        <div className="flex items-center gap-2 rounded-md bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400 border border-amber-500/20">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          <span>Project manager rights required to update progress weights. Read-only mode active.</span>
        </div>
      )}

      {/* Phase selection tabs */}
      <div className="flex border-b text-sm font-medium gap-4">
        {(["prefabrication", "painting", "assembly", "erection"] as ProgressWeightPhase[]).map(
          (phase) => (
            <button
              key={phase}
              className={`pb-2 border-b-2 transition-colors ${
                activePhase === phase
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => handlePhaseChange(phase)}
            >
              {PHASE_LABELS[phase]}
              {phase === "assembly" && !data?.assemblyEnabled && (
                <Badge variant="outline" className="ml-2 text-xs text-amber-600 border-amber-500/30">
                  Disabled
                </Badge>
              )}
            </button>
          )
        )}
      </div>

      {isAssemblyDisabled && (
        <div className="flex items-center gap-2 rounded-md bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400 border border-amber-500/20">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Assembly phase is disabled in Project Settings for this project.</span>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>{PHASE_LABELS[activePhase]} Progress Weights</CardTitle>
            <CardDescription>
              Assign activity progress weight percentages. Total must equal exactly 100%.
            </CardDescription>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 font-mono text-sm font-semibold">
              <span>Total:</span>
              <span className={isTotalValid ? "text-emerald-600" : "text-amber-600"}>
                {currentTotal.toFixed(2)}%
              </span>
              {isTotalValid ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-amber-600" />
              )}
            </div>

            {canManage && !isAssemblyDisabled && (
              <Button onClick={handleSave} disabled={isSaving || !isTotalValid}>
                <Save className="mr-2 h-4 w-4" /> Save Weights
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {validationError && (
            <p className="text-xs text-destructive bg-destructive/10 p-2 rounded">
              {validationError}
            </p>
          )}

          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="flex-1">
                  <Input
                    placeholder="Activity Code (e.g. FITUP)"
                    value={item.activity}
                    onChange={(e) => handleItemChange(index, "activity", e.target.value.toUpperCase())}
                    disabled={isSaving || isAssemblyDisabled || !canManage}
                  />
                </div>
                <div className="w-32">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="Weight %"
                    value={item.weight}
                    onChange={(e) => handleItemChange(index, "weight", parseFloat(e.target.value) || 0)}
                    disabled={isSaving || isAssemblyDisabled || !canManage}
                  />
                </div>
                {canManage && !isAssemblyDisabled && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveItem(index)}
                    disabled={isSaving}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {canManage && !isAssemblyDisabled && (
            <Button variant="outline" size="sm" onClick={handleAddItem} disabled={isSaving}>
              <Plus className="mr-2 h-4 w-4" /> Add Activity
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
