import { NotOnSupabaseYet } from "@/components/pipeqc/not-on-supabase-yet"

export default function LineCheckProgressPage() {
  return (
    <NotOnSupabaseYet
      title="Line Check · Progress"
      track="Track 10"
      summary="Record line check results per item and close the request."
    />
  )
}
