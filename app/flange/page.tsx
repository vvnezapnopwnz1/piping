import { Suspense } from "react";
import { FlangeBrowse } from "@/components/flange/flange-browse";

export default function FlangePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Flange Management
        </h1>
        <p className="text-muted-foreground">
          Browse bolted flange joints, track torquing progress, and record jointing
          execution per Easy Piping §19.2.1.
        </p>
      </div>
      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading flange browser…</div>}>
        <FlangeBrowse />
      </Suspense>
    </div>
  );
}
