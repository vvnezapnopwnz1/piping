"use client"

import { useTranslations } from "next-intl"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

import { errorDetail } from "@/i18n/format"
import { useNameWorkContext, useWorkContextParam } from "@/components/pipeqc/work-context"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import { loadSpoolStatus, type SpoolStatus } from "../../infrastructure/supabase-construction-repository"

/**
 * The spool a fabrication screen works on, kept in the address bar as `?spool=<revision id>`.
 * A spool chosen on one shop step is already chosen on the next, a blocker link can hand one
 * over, and Back or reload restore it. The status is read for that revision directly, so a
 * spool beyond the first page of the picker still opens; a revision of another project is
 * ignored rather than shown under this one.
 */
export function useContextSpool(
  projectId: string,
  { enabled = true }: { enabled?: boolean } = {},
): [SpoolStatus | null, (status: SpoolStatus | null, options?: { push?: boolean; extra?: Record<string, string | null> }) => void] {
  const t = useTranslations("fabrication.shared")
  const [param, setParam] = useWorkContextParam("spool")
  const [selectedParam, setSelectedParam] = useState<string | null>(null)
  const [loaded, setLoaded] = useState<SpoolStatus | null>(null)
  const effectiveParam = selectedParam ?? param
  const spool = loaded && loaded.spoolRevisionId === effectiveParam && loaded.projectId === projectId ? loaded : null

  useEffect(() => {
    setSelectedParam(null)
  }, [param])

  useEffect(() => {
    if (!enabled || !param || (loaded?.spoolRevisionId === param && loaded.projectId === projectId)) return
    let cancelled = false
    void loadSpoolStatus(getSupabaseBrowserClient(), param)
      .then((status) => {
        if (!cancelled && status.projectId === projectId) setLoaded(status)
      })
      .catch((error: unknown) => {
        if (!cancelled)
          toast.error(t("theSelectedSpoolCouldNot"), { description: errorDetail(error) })
      })
    return () => {
      cancelled = true
    }
  }, [enabled, loaded, param, projectId])

  useNameWorkContext("spool", spool?.spoolRevisionId, spool?.spoolNumber)

  const select = useCallback(
    (status: SpoolStatus | null, options?: { push?: boolean; extra?: Record<string, string | null> }) => {
      setSelectedParam(status?.spoolRevisionId ?? null)
      setLoaded(status)
      setParam(status?.spoolRevisionId ?? null, options)
    },
    [setParam],
  )

  return [spool, select]
}

import type { FabricationOperationId } from "./fabrication-operations"

/**
 * A screen rendered inside the fabrication workbench gets its spool from there, and reports a
 * re-read status back so the workbench's stage timeline moves with what was just recorded.
 */
export interface EmbeddedSpool {
  spool: SpoolStatus
  onSpoolChange: (status: SpoolStatus | null) => void
  onOpenOperation?: (id: FabricationOperationId) => void
  canOpenOperation?: (id: FabricationOperationId) => boolean
}
