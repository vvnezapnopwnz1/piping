"use client"

import { useContext } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { RecordableErectionStage } from "../../application/record-erection-progress"
import {
  ErectionEmbeddedContext,
  ErectionScreenShell,
  useErectionCommands,
} from "./erection-screen-shell"
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
  const embedded = useContext(ErectionEmbeddedContext)
  const commands = useErectionCommands()

  return (
    <ErectionScreenShell
      title={title}
      description={description}
      state={state}
      commands={commands}
    >
      {(selected) => (
        <>
          {embedded ? null : (
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
          )}

          <ErectionStageCard
            row={selected}
            stage={stage}
            canRecord={state.canRecord}
            dataCurrent={state.dataCurrent}
            onRecorded={state.refresh}
          />
        </>
      )}
    </ErectionScreenShell>
  )
}
