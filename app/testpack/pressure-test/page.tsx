import { NotOnSupabaseYet } from "@/components/pipeqc/not-on-supabase-yet"

export default function PressureTestPage() {
  return (
    <NotOnSupabaseYet
      title="Pressure Test"
      track="Track 10"
      summary="The pressure-test workflow over a test pack: line check, blinding, testing, reinstatement and item clearance."
    />
  )
}
