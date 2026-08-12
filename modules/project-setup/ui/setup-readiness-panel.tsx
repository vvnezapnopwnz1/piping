"use client"

import { CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { ProjectSetupReadiness } from "../domain/setup-readiness"
import { evaluateReadinessStatus, getRequirementDetails } from "../domain/setup-readiness"

export function SetupReadinessPanel({
  readiness,
  onNavigateTab,
}: {
  readiness: ProjectSetupReadiness
  onNavigateTab?: (tab: string) => void
}) {
  const { isGateBReady, isAdminDone } = evaluateReadinessStatus(readiness.missingCodes)

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Project Setup Readiness</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={isGateBReady ? "default" : "outline"} className={isGateBReady ? "bg-emerald-600" : "text-amber-600 border-amber-500/30"}>
              {isGateBReady ? <CheckCircle2 className="mr-1 h-3 w-3" /> : <AlertTriangle className="mr-1 h-3 w-3" />}
              Gate B: {isGateBReady ? "Ready for Import" : "Incomplete"}
            </Badge>
            <Badge variant={isAdminDone ? "default" : "outline"} className={isAdminDone ? "bg-emerald-600" : "text-amber-600 border-amber-500/30"}>
              {isAdminDone ? <CheckCircle2 className="mr-1 h-3 w-3" /> : <AlertTriangle className="mr-1 h-3 w-3" />}
              Gate C: {isAdminDone ? "Referential Complete" : "Incomplete"}
            </Badge>
          </div>
        </div>
        <CardDescription>
          Gate B readiness is required before importing engineering packages (ISO, Spool, Weld). Gate C represents full setup completion.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {readiness.missingCodes.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400 font-medium">
            <CheckCircle2 className="h-4 w-4" />
            All project referential requirements are satisfied. The project is ready for engineering imports and execution.
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Missing Referentials ({readiness.missingCodes.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {readiness.missingCodes.map((code) => {
                const req = getRequirementDetails(code)
                return (
                  <button
                    key={code}
                    onClick={() => onNavigateTab && onNavigateTab(req.tab)}
                    className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2.5 py-1 text-xs font-medium hover:bg-accent transition-colors"
                  >
                    <span>{req.label}</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
