import { useTranslations } from "next-intl"

import { NotOnSupabaseYet } from "@/components/pipeqc/not-on-supabase-yet"

export default function IsoWorkflowPage() {
  const nav = useTranslations("nav")
  const t = useTranslations("spooling.placeholder")
  return <NotOnSupabaseYet title={nav("isoWorkflow")} track={t("track")} summary={t("isoWorkflow")} />
}
