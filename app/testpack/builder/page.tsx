import { NotOnSupabaseYet } from "@/components/pipeqc/not-on-supabase-yet"

export default function TestPackBuilderPage() {
  return (
    <NotOnSupabaseYet
      title="Test Pack Builder"
      track="Track 10"
      summary="Compose a test pack from lines and spools that the readiness projection reports as eligible."
    />
  )
}
