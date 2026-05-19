"use client";

import { Suspense } from "react";
import { RFTView } from "@/components/erection/rft-view";

export default function RFTPage() {
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
