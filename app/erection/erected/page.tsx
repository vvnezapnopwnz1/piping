"use client";

import { Suspense } from "react";
import { ErectedView } from "@/components/erection/erected-view";

export default function Page() {
  return (
    <Suspense
      fallback={<div className="p-6 text-sm text-slate-500">Loading…</div>}
    >
      <ErectedView />
    </Suspense>
  );
}
