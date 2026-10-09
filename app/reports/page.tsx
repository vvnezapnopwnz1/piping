"use client"

import { useTranslations } from "next-intl"

import { useSupabaseAuth } from "@/contexts/supabase-auth-context"
import { ReportsScreen } from "@/modules/documents/ui/reports-screen"

export default function ReportsPage() {
  const t = useTranslations("documents")
  const project = useSupabaseAuth().access
  if (!project) return <p className="p-6 text-sm text-muted-foreground">{t("noProject")}</p>
  return <ReportsScreen key={project.projectId} projectId={project.projectId} projectCode={project.activityCode} />
}
