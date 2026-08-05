"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { RecordableErectionStage } from "../../application/record-erection-progress"
import { ErectionScreenShell } from "./erection-screen-shell"
import { ErectionStageCard } from "./erection-stage-card"
import { ErectionStageTimeline } from "./erection-stage-view"
import { useErectionReadiness } from "./use-erection-readiness"

/** The screen behind /erection/to-site and /erection/erected: one milestone, one date. */
export function ErectionStageScreen({
  stage,
  title,
  description,
}: {
  stage: RecordableErectionStage
  title: string
  description: string
}) {
  const state = useErectionReadiness()

  return (
    <ErectionScreenShell title={title} description={description} state={state}>
      {(selected) => (
        <>
          <Card>
            <CardHeader>
              <CardTitle>
                {selected.isoNumber} / {selected.spoolNumber} ({selected.revisionNumber})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ErectionStageTimeline row={selected} />
            </CardContent>
          </Card>

          <ErectionStageCard
            row={selected}
            stage={stage}
            canRecord={state.canRecord}
            onRecorded={state.refresh}
          />
        </>
      )}
    </ErectionScreenShell>
  )
}
