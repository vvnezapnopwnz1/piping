"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TrackingSpoolTable } from "./tracking-spool-table"
import { TrackingDataAnalysisLocationTab } from "./tracking-data-analysis-location-tab"
import { TrackingDataAnalysisDesignAreaTab } from "./tracking-data-analysis-design-area-tab"
import { TrackingDataAnalysisConsolidationTab } from "./tracking-data-analysis-consolidation-tab"
import { TrackingDetailPanel } from "./tracking-detail-panel"
import { useTrackingEnrichedRows } from "./use-tracking-rows"

export function TrackingDataAnalysisTabs() {
  const [tab, setTab] = useState("spool-location")
  const [selectedSpool, setSelectedSpool] = useState<string | null>(null)
  const rows = useTrackingEnrichedRows()
  const selectedRow = selectedSpool
    ? rows.find((r) => r.spool.spoolNo === selectedSpool) ?? null
    : null

  return (
    <>
      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="spool-location">Spool location</TabsTrigger>
          <TabsTrigger value="location">Location</TabsTrigger>
          <TabsTrigger value="design-area">Design area</TabsTrigger>
          <TabsTrigger value="consolidation">Consolidation reports</TabsTrigger>
        </TabsList>
        <TabsContent value="spool-location">
          <TrackingSpoolTable
            selectedLocation={null}
            selectedSpool={selectedSpool}
            onSelectSpool={setSelectedSpool}
            activeOnly
          />
        </TabsContent>
        <TabsContent value="location">
          <TrackingDataAnalysisLocationTab />
        </TabsContent>
        <TabsContent value="design-area">
          <TrackingDataAnalysisDesignAreaTab />
        </TabsContent>
        <TabsContent value="consolidation">
          <TrackingDataAnalysisConsolidationTab onSelectSpool={setSelectedSpool} />
        </TabsContent>
      </Tabs>
      {tab === "consolidation" && selectedRow ? (
        <TrackingDetailPanel
          row={selectedRow}
          open={!!selectedRow}
          onClose={() => setSelectedSpool(null)}
        />
      ) : null}
    </>
  )
}
