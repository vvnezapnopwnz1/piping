import { useTranslations } from "next-intl"

export default function SettingsPage() {
  const t = useTranslations("settings")
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-foreground">{t("title")}</h1>
      <p className="text-muted-foreground">{t("description")}</p>
    </div>
  )
}
