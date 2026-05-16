import { Suspense } from "react";
import { ReportsView } from "@/components/reports/reports-view";

export default function ReportsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-sm text-slate-500">Loading reports…</div>
      }
    >
      <ReportsView />
    </Suspense>
  );
}
