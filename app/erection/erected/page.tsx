"use client";

import { Suspense } from "react";
import { ErectedView } from "@/components/erection/erected-view";
import { useAppMode } from "@/contexts/app-mode-context"
import { ErectionSupabaseScreen } from "@/modules/construction/ui/erection/erection-supabase-screen"

export default function Page() {
  const mode = useAppMode()
  if (mode !== "demo") return <ErectionSupabaseScreen title="Erected" description="Record the erection milestone for an accepted field spool." action="progress" />
  return (
    <Suspense
      fallback={<div className="p-6 text-sm text-slate-500">Loading…</div>}
    >
      <ErectedView />
    </Suspense>
  );
}
