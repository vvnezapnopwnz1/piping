"use client"

import { AdminPageHeader } from "@/components/admin/admin-module-ui"
import { SystemReferentialCard } from "@/components/admin/system-referential-card"
import { SupabaseSystemReferentialView } from "@/components/admin/supabase-system-referential-view"
import { useAppMode } from "@/contexts/app-mode-context"

function DemoSystemReferentialCards() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <SystemReferentialCard
        slice="materialTypes"
        title="Material Type"
        description="Types of materials used across projects."
        codePlaceholder="e.g. CS-A106B"
        descriptionPlaceholder="Carbon Steel A106 Gr. B"
      />
      <SystemReferentialCard
        slice="filmQty"
        title="Film Quantity per Diameter"
        description="RT film quantity matrix by diameter and thickness."
        codePlaceholder="e.g. DN-25-50"
        descriptionPlaceholder="Diameter range — films per joint"
      />
      <SystemReferentialCard
        slice="utCalc"
        title="UT Calculation"
        description="UT coefficients by diameter and rating."
        codePlaceholder="e.g. UT-CARBON-A"
        descriptionPlaceholder="Coefficient — applicable range"
      />
      <SystemReferentialCard
        slice="torquing"
        title="Torquing Requirement"
        description="Torquing method used by flange management."
        codePlaceholder="e.g. TRQ-LR"
        descriptionPlaceholder="Torque table / method"
      />
    </div>
  )
}

export default function SystemReferentialPage() {
  const appMode = useAppMode()

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Admin · System Referential"
        description="Cross-project referentials maintained at system-admin scope."
      />

      {appMode === "demo" ? (
        <DemoSystemReferentialCards />
      ) : (
        <SupabaseSystemReferentialView />
      )}
    </div>
  )
}
