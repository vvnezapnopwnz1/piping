"use client"

import { useState } from "react"
import { SpoolingView } from "@/components/spooling/spooling-view"
import { IsoWorkflowView } from "@/components/spooling/iso-workflow-view"
import { IsoDetailPanel } from "@/components/spooling/iso-detail-panel"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ISORecord } from "@/store/spooling-store"

export default function IsoWorkflowPage() {
  const [selectedISO, setSelectedISO] = useState<ISORecord | null>(null)

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-foreground">ISO Workflow</h1>
      <p className="text-sm text-slate-500">
        Receive, checkout, check, hold and release ISOs through the spooling lifecycle.
      </p>

      <Tabs defaultValue="workflow" className="space-y-3">
        <TabsList>
          <TabsTrigger value="workflow">ISO Workflow</TabsTrigger>
          <TabsTrigger value="demo-import">Demo Import (Legacy)</TabsTrigger>
        </TabsList>

        <TabsContent value="workflow">
          <IsoWorkflowView onSelectISO={setSelectedISO} />
        </TabsContent>

        <TabsContent value="demo-import">
          <SpoolingView />
        </TabsContent>
      </Tabs>

      <IsoDetailPanel
        iso={selectedISO}
        open={!!selectedISO}
        onClose={() => setSelectedISO(null)}
      />
    </div>
  )
}
