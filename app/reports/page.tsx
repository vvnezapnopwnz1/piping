"use client"

import { useTranslations } from "next-intl"

import { useSupabaseAuth } from "@/contexts/supabase-auth-context"
import { documentAuthor } from "@/modules/documents/ui/document-author"
import { ReportsScreen } from "@/modules/documents/ui/reports-screen"

export default function ReportsPage() {
  const t = useTranslations("documents")
  const { access: project, user } = useSupabaseAuth()
  if (!project || !user) return <p className="p-6 text-sm text-muted-foreground">{t("noProject")}</p>
  return (
    <ReportsScreen
      key={project.projectId}
      projectId={project.projectId}
      projectCode={project.activityCode}
      projectTitle={project.title}
      author={documentAuthor(user)}
    />
  )
}
