"use client"

import * as React from "react"
import Link from "next/link"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import {
  ReferenceCombobox,
  type ReferenceOption,
} from "@/components/ui/reference-combobox"
import type {
  BillLine,
  MaterialCandidate,
} from "../domain/material-check"
import type { MaterialDraftChoice } from "../application/material-check-draft"
import { createMaterialRequestOwner } from "../application/material-check-draft"
import {
  searchMaterialTraceCandidates,
  type MaterialCandidateCursor,
} from "../infrastructure/supabase-material-check-repository"

export interface MaterialTracePickerProps {
  targetKey: string
  line: BillLine
  selectedDraft?: MaterialDraftChoice
  disabled?: boolean
  pmlHref?: string
  onChoose: (line: BillLine, candidate: MaterialCandidate) => void
  onClear: (spoolRevisionMaterialId: string) => void
}

export function MaterialTracePicker({
  targetKey,
  line,
  selectedDraft,
  disabled = false,
  pmlHref,
  onChoose,
  onClear,
}: MaterialTracePickerProps) {
  const [query, setQuery] = useState("")
  const [options, setOptions] = useState<MaterialCandidate[]>([])
  const [cursor, setCursor] = useState<MaterialCandidateCursor | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasOpened, setHasOpened] = useState(false)

  const ownerRef = useRef(createMaterialRequestOwner())
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Map of candidate id -> MaterialCandidate snapshot
  const candidatesByIdRef = useRef<Map<string, MaterialCandidate>>(new Map())

  // Keep selectedDraft registered in candidates map
  useEffect(() => {
    if (selectedDraft) {
      candidatesByIdRef.current.set(selectedDraft.pipingMaterialRecordId, {
        id: selectedDraft.pipingMaterialRecordId,
        identCode: selectedDraft.identCode,
        traceNumber: selectedDraft.traceNumber,
        mrrNumber: selectedDraft.mrrNumber,
        status: "active",
      })
    }
  }, [selectedDraft])

  // Invalidate when targetKey or line changes
  useEffect(() => {
    ownerRef.current.invalidate()
    setOptions([])
    setCursor(null)
    setLoading(false)
    setLoadingMore(false)
    setError(null)
    setQuery("")
    setHasOpened(false)
  }, [targetKey, line.spoolRevisionMaterialId])

  const fetchCandidates = useCallback(
    async (
      searchText: string,
      initialCursor: MaterialCandidateCursor | null,
      isMore: boolean,
    ) => {
      const token = ownerRef.current.begin()
      if (isMore) {
        setLoadingMore(true)
      } else {
        setLoading(true)
      }
      setError(null)

      try {
        const client = getSupabaseBrowserClient()
        const page = await searchMaterialTraceCandidates(client, {
          spoolRevisionMaterialId: line.spoolRevisionMaterialId,
          query: searchText,
          cursor: initialCursor,
        })

        if (!ownerRef.current.isCurrent(token)) return

        for (const opt of page.options) {
          candidatesByIdRef.current.set(opt.id, opt)
        }

        setOptions((prev) => {
          if (isMore) {
            const existingIds = new Set(prev.map((o) => o.id))
            const newOpts = page.options.filter((o) => !existingIds.has(o.id))
            return [...prev, ...newOpts]
          }
          return page.options
        })
        setCursor(page.nextCursor)
      } catch (err: unknown) {
        if (!ownerRef.current.isCurrent(token)) return
        const msg = err instanceof Error ? err.message : "Search failed"
        if (msg.includes("permission denied") || msg.includes("42501")) {
          setError("Material reference is unavailable for your access")
        } else {
          setError(msg)
        }
      } finally {
        if (ownerRef.current.isCurrent(token)) {
          setLoading(false)
          setLoadingMore(false)
        }
      }
    },
    [line.spoolRevisionMaterialId],
  )

  const handleQueryChange = useCallback(
    (newQuery: string) => {
      setQuery(newQuery)
      setHasOpened(true)
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      debounceTimerRef.current = setTimeout(() => {
        void fetchCandidates(newQuery, null, false)
      }, 200)
    },
    [fetchCandidates],
  )

  const handleLoadMore = useCallback(() => {
    if (!cursor || loadingMore || loading) return
    void fetchCandidates(query, cursor, true)
  }, [cursor, loadingMore, loading, fetchCandidates, query])

  const handleRetry = useCallback(() => {
    void fetchCandidates(query, null, false)
  }, [fetchCandidates, query])

  // Trigger initial fetch when user first interacts
  const handleInteraction = useCallback(() => {
    if (!hasOpened) {
      setHasOpened(true)
      void fetchCandidates(query, null, false)
    }
  }, [hasOpened, fetchCandidates, query])

  const referenceOptions: ReferenceOption[] = useMemo(() => {
    return options.map((opt) => ({
      id: opt.id,
      label: `${opt.traceNumber} · MRR ${opt.mrrNumber} · ${opt.identCode}`,
    }))
  }, [options])

  const selectedLabel = useMemo(() => {
    if (!selectedDraft) return null
    return `${selectedDraft.traceNumber} (MRR ${selectedDraft.mrrNumber})`
  }, [selectedDraft])

  const handleChoose = useCallback(
    (id: string) => {
      const candidate = candidatesByIdRef.current.get(id)
      if (candidate) {
        onChoose(line, candidate)
      }
    },
    [line, onChoose],
  )

  const handleClear = useCallback(() => {
    onClear(line.spoolRevisionMaterialId)
  }, [line.spoolRevisionMaterialId, onClear])

  const emptyMessage = query.trim() === ""
    ? "No active PML evidence matches this BOM row"
    : "No matching traces"

  const bomTraceNotice = line.expectedTraceNumber
    ? `BOM trace: ${line.expectedTraceNumber}`
    : "BOM does not specify a trace"

  return (
    <div className="flex flex-col gap-1 w-full" onClick={handleInteraction} onFocus={handleInteraction}>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground px-0.5">
        <span className="truncate">{bomTraceNotice}</span>
        {pmlHref ? (
          <Link
            href={pmlHref}
            className="shrink-0 text-[10px] uppercase tracking-wider text-primary hover:underline"
          >
            Open PML
          </Link>
        ) : (
          <span className="shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground/70">
            Source: PML
          </span>
        )}
      </div>
      <ReferenceCombobox
        label={`Material trace for ${line.identCode}`}
        selectedId={selectedDraft?.pipingMaterialRecordId ?? null}
        selectedLabel={selectedLabel}
        options={referenceOptions}
        query={query}
        loading={loading}
        loadingMore={loadingMore}
        error={error}
        onQueryChange={handleQueryChange}
        onChoose={handleChoose}
        onClear={handleClear}
        onLoadMore={handleLoadMore}
        hasMore={Boolean(cursor)}
        onRetry={handleRetry}
        disabled={disabled}
        emptyMessage={emptyMessage}
        placeholder="Select registered trace"
      />
    </div>
  )
}
