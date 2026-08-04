"use client";

import { Suspense } from "react";
import { FieldMaterialCheckView } from "@/components/erection/field-material-check-view";
import { useAppMode } from "@/contexts/app-mode-context"
import { ErectionSupabaseScreen } from "@/modules/construction/ui/erection/erection-supabase-screen"

export default function Page() {
  const mode = useAppMode()
  if (mode !== "demo") return <ErectionSupabaseScreen title="Field Material Check" description="Confirm field material traces against the accepted spool bill of materials." action="material" />
  return (
    <Suspense
      fallback={<div className="p-6 text-sm text-slate-500">Loading…</div>}
    >
      <FieldMaterialCheckView />
    </Suspense>
  );
}
