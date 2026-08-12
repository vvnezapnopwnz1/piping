"use client"

import { useSupabaseAuth } from "@/contexts/supabase-auth-context"
import { TrackingBarcodeScreen } from "@/modules/tracking/ui/tracking-barcode-screen"

export default function PrintBarcodesPage() {
  const access = useSupabaseAuth().access
  if (!access) return <p className="p-6 text-sm text-muted-foreground">Select a project to export spool barcodes.</p>
  return <TrackingBarcodeScreen projectId={access.projectId} projectCode={access.activityCode} />
}
