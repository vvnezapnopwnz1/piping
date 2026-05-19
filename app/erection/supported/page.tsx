"use client";

import { Suspense } from "react";
import { SupportedView } from "@/components/erection/supported-view";

export default function SupportedPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading…</div>}>
      <SupportedView />
    </Suspense>
  );
}
