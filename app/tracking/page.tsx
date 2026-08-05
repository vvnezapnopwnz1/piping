import { NotOnSupabaseYet } from "@/components/pipeqc/not-on-supabase-yet"

export default function TrackingPage() {
  return (
    <NotOnSupabaseYet
      title="Spool Tracking"
      track="Track 08"
      summary="Append-only spool movement history, current location per spool, transit alerts and capacity per laydown area, recorded by scanning on site."
    />
  )
}
