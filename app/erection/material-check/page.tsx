"use client";

import { Suspense } from "react";
import { FieldMaterialCheckView } from "@/components/erection/field-material-check-view";

export default function Page() {
  return (
    <Suspense
      fallback={<div className="p-6 text-sm text-slate-500">Loading…</div>}
    >
      <FieldMaterialCheckView />
    </Suspense>
  );
}
