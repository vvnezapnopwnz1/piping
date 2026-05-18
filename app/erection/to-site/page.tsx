"use client";

import { Suspense } from "react";
import { ToSiteView } from "@/components/erection/to-site-view";

export default function Page() {
  return (
    <Suspense
      fallback={<div className="p-6 text-sm text-slate-500">Loading…</div>}
    >
      <ToSiteView />
    </Suspense>
  );
}
