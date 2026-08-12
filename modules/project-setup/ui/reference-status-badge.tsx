"use client"

import { Badge } from "@/components/ui/badge"
import type { ReferenceStatus } from "../domain/reference"

export function ReferenceStatusBadge({ status }: { status: ReferenceStatus }) {
  switch (status) {
    case "active":
      return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">Active</Badge>
    case "inactive":
      return <Badge variant="secondary" className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30">Inactive</Badge>
    case "archived":
      return <Badge variant="outline" className="bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/30">Archived</Badge>
  }
}
