import { Suspense } from "react";
import { ProgressView } from "@/components/testpack/testing-precomm/progress-view";

export default function TestingPrecommProgressPage() {
  return (
    <div className="h-full p-6">
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-full text-sm text-slate-500">
            Loading…
          </div>
        }
      >
        <ProgressView />
      </Suspense>
    </div>
  );
}
