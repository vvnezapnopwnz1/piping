import { Suspense } from "react";
import { AdminTabs } from "./admin-tabs";

export default function AdminPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Admin · Project Referential
        </h1>
        <p className="text-muted-foreground">
          Set up subcontractors, work crews, and engineering references for the
          project.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="h-40 rounded-xl border border-slate-200 bg-white" />
        }
      >
        <AdminTabs />
      </Suspense>
    </div>
  );
}
