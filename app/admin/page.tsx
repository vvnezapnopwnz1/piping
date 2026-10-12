// app/admin/page.tsx
"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { ArrowRight } from "lucide-react"

import { AdminPageHeader } from "@/components/admin/admin-module-ui"
import { canVisit } from "@/components/pipeqc/navigation-model"
import { withProject } from "@/components/pipeqc/project-url"
import { useSupabaseAuth } from "@/contexts/supabase-auth-context"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import { useOptionalAccess } from "@/modules/access/ui/access-context"
import type { ProjectSetupReadiness } from "@/modules/project-setup/domain/setup-readiness"
import { loadProjectSetupReadiness } from "@/modules/project-setup/infrastructure/supabase-setup-readiness-repository"
import { SetupReadinessPanel } from "@/modules/project-setup/ui/setup-readiness-panel"

/** The setup pages in the order a project is configured; each title is the page's tab name. */
const SETUP_STEPS = [
  { key: "projectDefinition", href: "/admin/project-definition" },
  { key: "systemReferential", href: "/admin/system-referential" },
  { key: "projectReferential", href: "/admin/project-referential" },
  { key: "progressWeights", href: "/admin/progress-weights" },
  { key: "accessRights", href: "/admin/access-rights" },
  { key: "imports", href: "/admin/imports" },
] as const

export default function AdminPage() {
  const t = useTranslations("admin.overview")
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

  return (
    <div className="space-y-4">
      <AdminPageHeader title={t("title")} description={t("description")} />

      {current && !current.readiness ? (
        <p className="text-muted-foreground text-sm">{tReferential("failedToLoad")}</p>
      ) : null}

      {current?.readiness ? (
        <SetupReadinessPanel
          readiness={current.readiness}
          hrefForReference={(key) => withProject(`/admin/project-referential?ref=${key}`, activityCode)}
        />
      ) : null}

      <ol className="space-y-2">
        {SETUP_STEPS.map((step, index) => {
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
                  href={withProject(step.href, activityCode)}
                  className="hover:bg-accent border-border flex items-center justify-between gap-4 rounded-md border p-3 transition-colors"
                >
                  {body}
                  <ArrowRight className="text-muted-foreground size-4 shrink-0" />
                </Link>
              ) : (
                <div className="border-border rounded-md border p-3 opacity-60">{body}</div>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
