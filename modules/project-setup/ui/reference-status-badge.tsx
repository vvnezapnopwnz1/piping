"use client"

import { StatusBadge } from "@/components/ui/status-badge"
import type { ReferenceStatus } from "../domain/reference"

/**
 * Referential rows carry the same three states everywhere, so they get the shared badge rather
 * than their own emerald/amber/zinc literals — those were invisible to the dark theme and to
 * anyone reading by shape instead of hue.
 */
export function ReferenceStatusBadge({ status }: { status: ReferenceStatus }) {
  return <StatusBadge status={status} />
}
