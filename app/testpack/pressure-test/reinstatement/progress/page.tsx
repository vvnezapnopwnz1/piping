"use client";

import { Suspense } from "react";
import { ProgressView } from "@/components/testpack/reinstatement/progress-view";

export default function Page() {
  return (
    <div className="h-[calc(100vh-64px)] p-4">
      <Suspense fallback={<div className="p-8 text-sm text-slate-500">Loading…</div>}>
        <ProgressView />
      </Suspense>
    </div>
  );
}
