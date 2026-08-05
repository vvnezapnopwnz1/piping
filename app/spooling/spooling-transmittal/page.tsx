import { NotOnSupabaseYet } from "@/components/pipeqc/not-on-supabase-yet"

export default function SpoolingTransmittalPage() {
  return (
    <NotOnSupabaseYet
      title="Spooling Transmittal"
      track="Track 04 (remaining)"
      summary="Outgoing transmittals that release spooled isometrics to the shop. The revision model is live; the transmittal document around it is the part of Track 04 still outstanding."
    />
  )
}
