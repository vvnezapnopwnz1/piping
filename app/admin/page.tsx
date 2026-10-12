// app/admin/page.tsx
"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { ArrowRight, Check } from "lucide-react"

import { AdminPageHeader } from "@/components/admin/admin-module-ui"
import { canVisit } from "@/components/pipeqc/navigation-model"
import { withProject } from "@/components/pipeqc/project-url"
import { useSupabaseAuth } from "@/contexts/supabase-auth-context"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import { useOptionalAccess } from "@/modules/access/ui/access-context"
import type { ProjectSetupReadiness } from "@/modules/project-setup/domain/setup-readiness"
import { loadProjectSetupReadiness } from "@/modules/project-setup/infrastructure/supabase-setup-readiness-repository"
import { setupStepStatus } from "@/modules/project-setup/ui/reference-catalog"

/** The setup pages in the order a project is configured; each title is the page's tab name. */
const SETUP_STEPS = [
  { key: "projectDefinition", href: "/admin/project-definition" },
  { key: "systemReferential", href: "/admin/system-referential" },
  { key: "projectReferential", href: "/admin/project-referential" },
  { key: "progressWeights", href: "/admin/progress-weights" },
  { key: "accessRights", href: "/admin/access-rights" },
  { key: "imports", href: "/admin/imports" },
] as const

type StepKey = (typeof SETUP_STEPS)[number]["key"]

type StepStatus =
  | { kind: "done"; label: string }
  | { kind: "missing"; label: string }

function StepStatusBadge({ status }: { status: StepStatus }) {
  if (status.kind === "done") {
    return (
      <span className="text-success-fg flex shrink-0 items-center gap-1.5 text-sm whitespace-nowrap">
        <Check className="size-4 shrink-0" />
        <span>{status.label}</span>
      </span>
    )
  }
  return (
    <span className="text-muted-foreground flex shrink-0 items-center gap-1.5 text-sm whitespace-nowrap">
      <span className="bg-warning-fg size-2 shrink-0 rounded-full" />
      <span>{status.label}</span>
    </span>
  )
}

export default function AdminPage() {
  const t = useTranslations("admin.overview")
  const tStatus = useTranslations("admin.overview.status")
  const tNav = useTranslations("nav")
  const tReferential = useTranslations("projectSetup.projectReferential")

  const auth = useSupabaseAuth()
  const access = useOptionalAccess()
  const projectId = auth.access?.projectId
  const activityCode = auth.access?.activityCode

  // `readiness: null` means the load failed. A result kept for another project is not shown.
  const [loaded, setLoaded] = useState<{ projectId: string; readiness: ProjectSetupReadiness | null } | null>(null)
  const current = loaded && loaded.projectId === projectId ? loaded : null

  useEffect(() => {
    if (!projectId) return
    let cancelled = false
    loadProjectSetupReadiness(getSupabaseBrowserClient(), projectId)
      .then((readiness) => {
        if (!cancelled) setLoaded({ projectId, readiness })
      })
      .catch(() => {
        if (!cancelled) setLoaded({ projectId, readiness: null })
      })
    return () => {
      cancelled = true
    }
  }, [projectId])

  const readiness = current?.readiness ?? null
  const stats = readiness ? setupStepStatus(readiness.missingCodes) : null
  const counted = (count: number, missing: string): StepStatus =>
    count === 0 ? { kind: "done", label: tStatus("done") } : { kind: "missing", label: missing }

  // Only the steps that have readiness codes say something; the others stay quiet.
  const statusOf = (key: StepKey): StepStatus | null => {
    if (!readiness || !stats) return null
    switch (key) {
      case "systemReferential":
        return counted(stats.systemReferential, tStatus("referentialsMissing", { count: stats.systemReferential }))
      case "projectReferential":
        return counted(stats.projectReferential.missing, tStatus("referentialsMissing", { count: stats.projectReferential.missing }))
      case "progressWeights":
        return counted(stats.progressWeights, tStatus("weightsMissing", { count: stats.progressWeights }))
      case "imports":
        return readiness.readyForImport ? null : { kind: "missing", label: tStatus("importBlocked") }
      default:
        return null
    }
  }

  // With references missing, the step opens the first of them rather than the top of the list.
  const hrefOf = (step: (typeof SETUP_STEPS)[number]): string =>
    step.key === "projectReferential" && stats?.projectReferential.first
      ? `/admin/project-referential?ref=${stats.projectReferential.first}`
      : step.href

  return (
    <div className="space-y-4">
      <AdminPageHeader title={t("title")} description={t("description")} />

      {current && !current.readiness ? (
        <p className="text-muted-foreground text-sm">{tReferential("failedToLoad")}</p>
      ) : null}

      <ol className="space-y-2">
        {SETUP_STEPS.map((step, index) => {
          const stepStatus = statusOf(step.key)
          const body = (
            <div className="flex min-w-0 items-start gap-4">
              <span className="bg-muted text-muted-foreground flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
                {index + 1}
              </span>
              <div className="min-w-0 space-y-0.5">
                <div className="text-foreground font-medium">{tNav(step.key)}</div>
                <p className="text-muted-foreground text-sm">{t(`steps.${step.key}`)}</p>
              </div>
            </div>
          )

          return (
            <li key={step.key}>
              {access && canVisit(step.href, access.can) ? (
                <Link
                  href={withProject(hrefOf(step), activityCode)}
                  className="hover:bg-accent border-border flex items-center justify-between gap-4 rounded-md border p-3 transition-colors"
                >
                  {body}
                  <div className="flex shrink-0 items-center gap-3">
                    {stepStatus ? <StepStatusBadge status={stepStatus} /> : null}
                    <ArrowRight className="text-muted-foreground size-4 shrink-0" />
                  </div>
                </Link>
              ) : (
                <div className="border-border flex items-center justify-between gap-4 rounded-md border p-3 opacity-60">
                  {body}
                  {stepStatus ? (
                    <div className="flex shrink-0 items-center">
                      <StepStatusBadge status={stepStatus} />
                    </div>
                  ) : null}
                </div>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
