"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"

import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import {
  loadSpoolStatuses,
  type SpoolStatus,
} from "../../infrastructure/supabase-construction-repository"
import { RecordSelectTable } from "@/components/ui/data-table/record-select-table"
import { FABRICATION_SPOOL_COLUMNS } from "./spool-columns"

interface SpoolPickerProps {
  projectId: string
  value: string | null
  onChange: (status: SpoolStatus) => void
  /** True while the operator is back in the list; see `SpoolSelectTable`. */
  browsing: boolean
  onBrowsingChange: (browsing: boolean) => void
  refreshToken?: number
}

export function SpoolPicker({
  projectId,
  value,
  onChange,
  browsing,
  onBrowsingChange,
  refreshToken = 0,
}: SpoolPickerProps) {
  const [statuses, setStatuses] = useState<SpoolStatus[]>([])
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

  return (
    <RecordSelectTable
      title="Spools"
      columns={FABRICATION_SPOOL_COLUMNS}
      rows={statuses}
      rowId={(spool) => spool.spoolRevisionId}
      selectedId={value}
      onSelect={onChange}
      browsing={browsing}
      onBrowsingChange={onBrowsingChange}
      loading={loading}
      namespace="spool"
      changeLabel="Change spool"
      searchPlaceholder="Search spool, ISO or stage…"
      emptyTitle="No spool is available on this project."
      emptyDescription="Spools appear once an engineering revision carrying them is accepted."
      selectedIdentity={(spool) => spool.spoolNumber}
      // The separator is in the text, not in CSS margin: without it the accessible name
      // concatenates to "AR1ISO-2201-14".
      selectedMeta={(spool) => `rev ${spool.revisionNumber} · ${spool.isoNumber}`}
    />
  )
}
