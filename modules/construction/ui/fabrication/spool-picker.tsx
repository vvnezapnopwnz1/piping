"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import {
  loadSpoolStatuses,
  type SpoolStatus,
} from "../../infrastructure/supabase-construction-repository"

interface SpoolPickerProps {
  projectId: string
  value: string | null
  onChange: (status: SpoolStatus) => void
  refreshToken?: number
}

export function SpoolPicker({ projectId, value, onChange, refreshToken = 0 }: SpoolPickerProps) {
  const [statuses, setStatuses] = useState<SpoolStatus[]>([])
  const [filter, setFilter] = useState("")
  // Derived rather than a setLoading(true) in the effect body, which would be a synchronous
  // setState inside an effect: the key changes the moment projectId or refreshToken does, so the
  // list reads as loading again immediately without an extra render pass.
  const requestKey = `${projectId}:${refreshToken}`
  const [settledKey, setSettledKey] = useState<string | null>(null)
  const loading = settledKey !== requestKey

  useEffect(() => {
    const key = `${projectId}:${refreshToken}`
    void loadSpoolStatuses(getSupabaseBrowserClient(), projectId)
      .then(setStatuses)
      .catch((error: unknown) =>
        toast.error(error instanceof Error ? error.message : "Spools could not be loaded."),
      )
      // Settled, not succeeded: a failed load must stop showing a skeleton it will never replace.
      .finally(() => setSettledKey(key))
  }, [projectId, refreshToken])

  const needle = filter.trim().toUpperCase()
  const visible = needle
    ? statuses.filter(
        (status) =>
          status.spoolNumber.toUpperCase().includes(needle) ||
          status.isoNumber.toUpperCase().includes(needle),
      )
    : statuses

  return (
    <div className="space-y-2">
      <Input
        value={filter}
        onChange={(event) => setFilter(event.target.value)}
        placeholder="Filter by ISO or spool number"
      />
      {loading ? (
        <div className="space-y-1">
          <Skeleton className="h-7 w-full" />
          <Skeleton className="h-7 w-full" />
          <Skeleton className="h-7 w-full" />
        </div>
      ) : (
      <ul className="max-h-96 space-y-1 overflow-y-auto">
        {visible.map((status) => (
          <li key={status.spoolRevisionId}>
            <button
              type="button"
              onClick={() => onChange(status)}
              aria-current={value === status.spoolRevisionId ? "true" : undefined}
              className={`focus-visible:ring-ring flex w-full items-center justify-between rounded px-2 py-1 text-left transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:outline-none ${
                value === status.spoolRevisionId ? "bg-muted" : ""
              }`}
            >
              {/* The separator is inside the text, not just CSS margin: without it the
                  accessible name concatenates to "SP-T4-001-AR1". */}
              <span className="font-mono text-xs">
                {status.spoolNumber}
                <span className="text-muted-foreground ml-2">{` · ${status.revisionNumber}`}</span>
              </span>
              <Badge variant="outline">{status.currentStage ?? "not started"}</Badge>
            </button>
          </li>
        ))}
        {visible.length === 0 ? (
          <li className="px-2 py-1 text-sm text-muted-foreground">
            No spool matches that filter.
          </li>
        ) : null}
      </ul>
      )}
    </div>
  )
}
