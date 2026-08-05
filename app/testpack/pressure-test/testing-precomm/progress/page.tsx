import { NotOnSupabaseYet } from "@/components/pipeqc/not-on-supabase-yet"

export default function TestingPrecommProgressPage() {
  return (
    <NotOnSupabaseYet
      title="Testing / Pre-commissioning · Progress"
      track="Track 10"
      summary="Record the test pressure, hold period and outcome."
    />
  )
}
