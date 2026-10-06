"use client"

import { ErectionWorkbenchRoute } from "@/modules/construction/ui/erection/erection-workbench"

// Erection is one field-spool workbench. Without an operation in the address it opens the one the selected spool needs next.
export default function ErectionOperationPage() {
  return <ErectionWorkbenchRoute />
}
