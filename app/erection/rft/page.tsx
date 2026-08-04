"use client";

import { Suspense } from "react";
import { RFTView } from "@/components/erection/rft-view";
import { useAppMode } from "@/contexts/app-mode-context"
import { ErectionSupabaseScreen } from "@/modules/construction/ui/erection/erection-supabase-screen"

export default function RFTPage() {
  const mode = useAppMode()
  if (mode !== "demo") return <ErectionSupabaseScreen title="Ready For Test" description="Auto-derived from field weld, support, NDE and PWHT evidence." action="gate" />
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Ready For Test</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Auto-derived RFT status — fires when all four predecessor steps are confirmed.
        </p>
      </div>
      <Suspense>
        <RFTView />
      </Suspense>
    </div>
  );
}
