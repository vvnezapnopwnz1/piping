"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import type {
  BillLine,
  MaterialCandidate,
  TraceEntry,
} from "../domain/material-check"
import {
  clearSavedMaterialDrafts,
  createMaterialRequestOwner,
  type MaterialDrafts,
} from "../application/material-check-draft"
import {
  loadMaterialCheckWorkspace,
  type MaterialCheckWorkspace,
} from "../infrastructure/supabase-material-check-repository"

export type WorkspaceLoadState = "idle" | "loading" | "ready" | "error"

export interface UseMaterialCheckWorkspaceParams {
  projectId?: string | null
  spoolRevisionId?: string | null
  defaultCheckedOn?: string
}

export interface UseMaterialCheckWorkspaceReturn {
  targetKey: string
  loadState: WorkspaceLoadState
  error: string | null
  workspace: MaterialCheckWorkspace | null
  drafts: MaterialDrafts
  entries: TraceEntry[]
  checkedOn: string
  setCheckedOn: (date: string) => void
  choose: (line: BillLine, candidate: MaterialCandidate) => void
  clearChoice: (spoolRevisionMaterialId: string) => void
  refresh: () => Promise<void>
  applySaved: (payload: {
    targetKey: string
    entries: readonly TraceEntry[]
    checkedOn: string
  }) => void
  applyRecordedDate: (payload: { targetKey: string; checkedOn: string }) => void
  isDirty: boolean
}

const today = () => new Date().toISOString().slice(0, 10)

export function useMaterialCheckWorkspace({
  projectId,
  spoolRevisionId,
  defaultCheckedOn,
}: UseMaterialCheckWorkspaceParams): UseMaterialCheckWorkspaceReturn {
  const targetKey = useMemo(
    () => JSON.stringify([projectId ?? null, spoolRevisionId ?? null]),
    [projectId, spoolRevisionId],
  )

  const ownerRef = useRef(createMaterialRequestOwner())
  const [loadState, setLoadState] = useState<WorkspaceLoadState>("idle")
  const [error, setError] = useState<string | null>(null)
  const [workspace, setWorkspace] = useState<MaterialCheckWorkspace | null>(null)
  const [drafts, setDrafts] = useState<MaterialDrafts>({})
  const [checkedOn, setCheckedOn] = useState<string>(defaultCheckedOn ?? today())

  const load = useCallback(
    async (targetRevId: string, token: number) => {
      setLoadState("loading")
      setError(null)
      try {
        const client = getSupabaseBrowserClient()
        const data = await loadMaterialCheckWorkspace(client, targetRevId)
        if (!ownerRef.current.isCurrent(token)) return

        setWorkspace(data)
        if (data.record?.checkedOn) {
          setCheckedOn(data.record.checkedOn)
        }
        setLoadState("ready")
        setError(null)
      } catch (err: unknown) {
        if (!ownerRef.current.isCurrent(token)) return
        setLoadState("error")
        setError(
          err instanceof Error
            ? err.message
            : "The material check workspace could not be loaded.",
        )
      }
    },
    [],
  )

  useEffect(() => {
    ownerRef.current.invalidate()
    setWorkspace(null)
    setDrafts({})
    setError(null)
    setCheckedOn(defaultCheckedOn ?? today())

    if (!spoolRevisionId) {
      setLoadState("idle")
      return
    }

    const token = ownerRef.current.begin()
    void load(spoolRevisionId, token)

    return () => {
      ownerRef.current.invalidate()
    }
  }, [spoolRevisionId, defaultCheckedOn, load])

  const refresh = useCallback(async () => {
    if (!spoolRevisionId) return
    const token = ownerRef.current.begin()
    await load(spoolRevisionId, token)
  }, [spoolRevisionId, load])

  const choose = useCallback(
    (line: BillLine, candidate: MaterialCandidate) => {
      if (!workspace) return

      setDrafts((prev) => ({
        ...prev,
        [line.spoolRevisionMaterialId]: {
          spoolRevisionMaterialId: line.spoolRevisionMaterialId,
          pipingMaterialRecordId: candidate.id,
          traceNumber: candidate.traceNumber,
          mrrNumber: candidate.mrrNumber,
        },
      }))
    },
    [workspace],
  )

  const clearChoice = useCallback((spoolRevisionMaterialId: string) => {
    setDrafts((prev) => {
      if (!prev[spoolRevisionMaterialId]) return prev
      const next = { ...prev }
      delete next[spoolRevisionMaterialId]
      return next
    })
  }, [])

  const applySaved = useCallback(
    (payload: {
      targetKey: string
      entries: readonly TraceEntry[]
      checkedOn: string
    }) => {
      if (payload.targetKey !== targetKey) return
      setDrafts((prev) => clearSavedMaterialDrafts(prev, payload.entries))
      setCheckedOn(payload.checkedOn)
    },
    [targetKey],
  )

  const applyRecordedDate = useCallback(
    (payload: { targetKey: string; checkedOn: string }) => {
      if (payload.targetKey !== targetKey) return
      setCheckedOn(payload.checkedOn)
    },
    [targetKey],
  )

  const entries: TraceEntry[] = useMemo(
    () =>
      Object.values(drafts).map((choice) => ({
        spoolRevisionMaterialId: choice.spoolRevisionMaterialId,
        pipingMaterialRecordId: choice.pipingMaterialRecordId,
      })),
    [drafts],
  )

  const isDirty = useMemo(() => Object.keys(drafts).length > 0, [drafts])

  return {
    targetKey,
    loadState,
    error,
    workspace,
    drafts,
    entries,
    checkedOn,
    setCheckedOn,
    choose,
    clearChoice,
    refresh,
    applySaved,
    applyRecordedDate,
    isDirty,
  }
}
