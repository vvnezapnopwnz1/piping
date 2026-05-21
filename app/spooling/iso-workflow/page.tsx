"use client";

import { SpoolingView } from "@/components/spooling/spooling-view";

export default function IsoWorkflowPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-foreground">
        ISO Workflow
      </h1>
      <p className="text-muted-foreground">
        Receive, check, and hold/release isos.
      </p>
      <SpoolingView />
    </div>
  );
}
