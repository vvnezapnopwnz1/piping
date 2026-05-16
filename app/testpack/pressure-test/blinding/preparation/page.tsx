import { Suspense } from "react";
import { PreparationView } from "@/components/testpack/blinding/preparation-view";

export default function BlindingPreparationPage() {
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
