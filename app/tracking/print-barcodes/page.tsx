"use client"

import { useTranslations } from "next-intl"
import { useSupabaseAuth } from "@/contexts/supabase-auth-context"
import { TrackingBarcodeScreen } from "@/modules/tracking/ui/tracking-barcode-screen"

export default function PrintBarcodesPage() {
  const t = useTranslations("tracking.routes")
  const access = useSupabaseAuth().access
  if (!access) return <p className="p-6 text-sm text-muted-foreground">{t("selectProjectBarcodes")}</p>
  return <TrackingBarcodeScreen projectId={access.projectId} projectCode={access.activityCode} />
}
