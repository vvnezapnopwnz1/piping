import { Suspense } from "react";
import { PreparationView } from "@/components/testpack/item-clearance/preparation-view";

export default function ItemClearancePreparationPage() {
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
