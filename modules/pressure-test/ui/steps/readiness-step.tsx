"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { withProject } from "@/components/pipeqc/project-url"
import { useSupabaseAuth } from "@/contexts/supabase-auth-context"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import type { PackStep } from "../../domain/pack-steps"
import {
  listTestPackIsoStatus,
  listTestPackMembers,
  listTestPackSpoolStatus,
  type TestPackIsoStatusRow,
  type TestPackMemberRow,
  type TestPackSpoolStatusRow,
} from "../../infrastructure/supabase-pressure-test-repository"
import { useTestPackTranslations } from "../test-pack-i18n"
import { isoBlockerLines } from "./iso-blockers"

/** Why the pack is or is not ready: the pack's reasons, then every isometric and spool with its own. */
export function ReadinessStep({ projectId, packId }: { projectId: string; packId: string; step?: PackStep }) {
  const t = useTestPackTranslations()
  const code = useSupabaseAuth()?.access?.activityCode
  const [members, setMembers] = useState<TestPackMemberRow[]>([])
  const [isos, setIsos] = useState<TestPackIsoStatusRow[]>([])
  const [spools, setSpools] = useState<TestPackSpoolStatusRow[]>([])

  useEffect(() => {
    let active = true
    const client = getSupabaseBrowserClient()
    void Promise.all([listTestPackMembers(client, projectId, packId), listTestPackIsoStatus(client, projectId, packId), listTestPackSpoolStatus(client, projectId, packId)]).then(([m, i, s]) => {
      if (!active) return
      setMembers(m)
      setIsos(i)
      setSpools(s)
    })
    return () => {
      active = false
    }
  }, [projectId, packId])

  const numbers = new Map(members.map((member) => [member.isometric_id ?? "", member.iso_number ?? ""]))
  return (
    <div className="space-y-3 text-sm">
      <ul className="space-y-1.5">
        {isos.map((iso) => (
          <li key={iso.isometric_id} className="flex flex-wrap items-center justify-between gap-2 rounded border px-3 py-2">
            <span className="font-mono font-medium">{numbers.get(iso.isometric_id ?? "") ?? iso.isometric_id}</span>
            <span className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{isoBlockerLines(iso.blocker_counts as Record<string, number> | null).map((line) => t(line.key, line.values)).join(", ")}</span>
              <Badge variant={iso.is_rft ? "default" : "secondary"}>{iso.is_rft ? t("steps.isoReady") : t("steps.isoBlocked")}</Badge>
            </span>
          </li>
        ))}
      </ul>
      {spools.length > 0 && (
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {spools.map((spool) => (
            <li key={spool.spool_revision_id}>
              <Link href={withProject(`/erection?spool=${spool.spool_revision_id}`, code)} className="flex items-center justify-between rounded border px-3 py-1.5 hover:bg-muted">
                <span className="font-mono">{spool.spool_number}</span>
                <span className="text-xs text-muted-foreground">
                  {spool.is_rft ? t("steps.isoReady") : t("steps.spoolPending", { nde: spool.nde_pending ?? 0, pwht: spool.pwht_pending ?? 0 })}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
