"use client"

import { FieldWeldProgressScreen } from "@/modules/construction/ui/erection/field-weld-progress-screen"

export default function WeldedBoltedPage() {
  return (
    <FieldWeldProgressScreen
      title="Welded / Bolted"
      description="Field weld completion uses the same rules as shop welds. Record the joints, then the Welded / Bolted milestone that Ready For Test depends on."
      stage="welded_bolted"
    />
  )
}
