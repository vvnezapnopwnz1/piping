"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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

  useEffect(() => {
    void loadSpoolStatuses(getSupabaseBrowserClient(), projectId)
      .then(setStatuses)
      .catch((error: unknown) =>
        toast.error(error instanceof Error ? error.message : "Spools could not be loaded."),
      )
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
      <ul className="max-h-96 space-y-1 overflow-y-auto">
        {visible.map((status) => (
          <li key={status.spoolRevisionId}>
            <button
              type="button"
              onClick={() => onChange(status)}
              className={`flex w-full items-center justify-between rounded px-2 py-1 text-left ${
                value === status.spoolRevisionId ? "bg-muted" : ""
              }`}
            >
              <span className="font-mono text-xs">{status.spoolNumber}</span>
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
    </div>
  )
}
