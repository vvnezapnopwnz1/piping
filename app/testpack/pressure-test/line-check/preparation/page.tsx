import { Suspense } from "react";
import { PreparationView } from "@/components/testpack/line-check/preparation-view";

export default function LineCheckPreparationPage() {
  return (
    <div className="h-full p-6">
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-full text-sm text-slate-500">
            Loading…
          </div>
        }
      >
        <PreparationView />
      </Suspense>
    </div>
  );
}
