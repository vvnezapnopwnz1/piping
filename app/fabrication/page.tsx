"use client"

import { FabricationWorkbenchRoute } from "@/modules/construction/ui/fabrication/fabrication-workbench"

// Fabrication is one spool workbench. Without an operation in the address it opens the one the selected spool needs next.
export default function FabricationOperationPage() {
  return <FabricationWorkbenchRoute />
}
