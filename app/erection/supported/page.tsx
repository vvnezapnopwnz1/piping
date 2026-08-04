"use client";

import { Suspense } from "react";
import { SupportedView } from "@/components/erection/supported-view";
import { useAppMode } from "@/contexts/app-mode-context"
import { ErectionSupabaseScreen } from "@/modules/construction/ui/erection/erection-supabase-screen"

export default function SupportedPage() {
  const mode = useAppMode()
  if (mode !== "demo") return <ErectionSupabaseScreen title="Supported" description="Record the field support milestone after field weld progress." action="support" />
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading…</div>}>
      <SupportedView />
    </Suspense>
  );
}
