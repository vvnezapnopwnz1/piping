"use client";

import { Suspense } from "react";
import { ToSiteView } from "@/components/erection/to-site-view";
import { useAppMode } from "@/contexts/app-mode-context"
import { ErectionSupabaseScreen } from "@/modules/construction/ui/erection/erection-supabase-screen"

export default function Page() {
  const mode = useAppMode()
  if (mode !== "demo") return <ErectionSupabaseScreen title="To Site" description="Record the field delivery milestone for an accepted spool." action="progress" />
  return (
    <Suspense
      fallback={<div className="p-6 text-sm text-slate-500">Loading…</div>}
    >
      <ToSiteView />
    </Suspense>
  );
}
