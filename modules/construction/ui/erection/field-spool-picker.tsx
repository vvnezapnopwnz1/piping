"use client"

import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { currentErectionStageLabel } from "../../application/describe-erection-readiness"
import type { ErectionReadiness } from "../../infrastructure/supabase-erection-repository"

interface FieldSpoolPickerProps {
  rows: readonly ErectionReadiness[]
  value: string | null
  onChange: (row: ErectionReadiness) => void
}

/**
 * The erection counterpart of `fabrication/spool-picker.tsx`. It picks from the readiness rows
 * the screen already holds rather than issuing its own read, because every erection screen
 * needs the same rows for its gate as well as for the list.
 */
export function FieldSpoolPicker({ rows, value, onChange }: FieldSpoolPickerProps) {
  const [filter, setFilter] = useState("")

  const needle = filter.trim().toUpperCase()
  const visible = needle
    ? rows.filter(
        (row) =>
          row.spoolNumber.toUpperCase().includes(needle) ||
          row.isoNumber.toUpperCase().includes(needle),
      )
    : rows

  return (
    <div className="space-y-2">
      <Input
        value={filter}
        onChange={(event) => setFilter(event.target.value)}
        placeholder="Filter by ISO or spool number"
      />
      <ul className="max-h-96 space-y-1 overflow-y-auto">
        {visible.map((row) => (
          <li key={row.spoolRevisionId}>
            <button
              type="button"
              onClick={() => onChange(row)}
              className={`flex w-full items-center justify-between gap-2 rounded px-2 py-1 text-left ${
                value === row.spoolRevisionId ? "bg-muted" : ""
              }`}
            >
              {/* The separator lives in the text, not in CSS margin, so the accessible name
                  does not concatenate to "SP-07-ER0". */}
              <span className="font-mono text-xs">
                {row.spoolNumber}
                <span className="text-muted-foreground ml-2">{` · ${row.revisionNumber}`}</span>
              </span>
              <Badge variant="outline">{currentErectionStageLabel(row)}</Badge>
            </button>
          </li>
        ))}
        {visible.length === 0 ? (
          <li className="text-muted-foreground px-2 py-1 text-sm">
            {rows.length === 0
              ? "No accepted field spool is available on this project."
              : "No spool matches that filter."}
          </li>
        ) : null}
      </ul>
    </div>
  )
}
