import { Suspense } from "react";
import { PreparationView } from "@/components/testpack/reinstatement/preparation-view";

export default function Page() {
  return (
    <div className="h-[calc(100vh-64px)] p-4">
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
