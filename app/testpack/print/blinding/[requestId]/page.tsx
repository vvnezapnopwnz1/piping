import { NotOnSupabaseYet } from "@/components/pipeqc/not-on-supabase-yet"

export default function BlindingPrintPage() {
  return (
    <NotOnSupabaseYet
      title="Blinding Form"
      track="Track 10"
      summary="The printable blind list, generated from the durable request and its results."
    />
  )
}
