import { NotOnSupabaseYet } from "@/components/pipeqc/not-on-supabase-yet"

export default function PrintBarcodesPage() {
  return (
    <NotOnSupabaseYet
      title="Print Barcodes"
      track="Track 08"
      summary="QR and barcode labels carrying a stable spool and revision identity, for scanning on site."
    />
  )
}
