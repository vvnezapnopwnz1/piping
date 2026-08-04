"use client";

import { Suspense } from "react";
import { WeldedBoltedView } from "@/components/erection/welded-bolted-view";
import { useAppMode } from "@/contexts/app-mode-context"
import { ErectionSupabaseScreen } from "@/modules/construction/ui/erection/erection-supabase-screen"

export default function WeldedBoltedPage() {
  const mode = useAppMode()
  if (mode !== "demo") return <ErectionSupabaseScreen title="Welded / Bolted" description="Field weld completion uses the same quality context as shop welds." action="weld" />
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading…</div>}>
      <WeldedBoltedView />
    </Suspense>
  );
}
