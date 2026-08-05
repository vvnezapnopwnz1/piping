"use client"

import { FieldSupportProgressScreen } from "@/modules/construction/ui/erection/field-support-progress-screen"

export default function SupportedPage() {
  return (
    <FieldSupportProgressScreen
      title="Supported"
      description="Record each support as installed, then the Supported milestone that Ready For Test depends on."
      stage="supported"
    />
  )
}
