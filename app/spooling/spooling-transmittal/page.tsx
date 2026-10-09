import { useTranslations } from "next-intl"

import { NotOnSupabaseYet } from "@/components/pipeqc/not-on-supabase-yet"

export default function SpoolingTransmittalPage() {
  const nav = useTranslations("nav")
  const t = useTranslations("spooling.placeholder")
  return <NotOnSupabaseYet title={nav("spoolingTransmittal")} track={t("track")} summary={t("spoolingTransmittal")} />
}
