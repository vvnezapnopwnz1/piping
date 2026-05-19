"use client";

import { Suspense } from "react";
import { WeldedBoltedView } from "@/components/erection/welded-bolted-view";

export default function WeldedBoltedPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading…</div>}>
      <WeldedBoltedView />
    </Suspense>
  );
}
