"use client"

import { useTranslations } from "next-intl"

import { useCallback, useEffect, useState } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { AlertCircle, RefreshCw } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import { loadProjectSetupReadiness } from "../infrastructure/supabase-setup-readiness-repository"
import type { ProjectSetupReadiness } from "../domain/setup-readiness"
import { SetupReadinessPanel } from "./setup-readiness-panel"
import { ReferenceNavigator } from "./reference-navigator"
import { GeneralReferences } from "./general-references"
import { WeldingReferences } from "./welding-references"
import { TestpackReferences } from "./testpack-references"
import { SpoolingReferences } from "./spooling-references"
import {
  REFERENCE_PARAM,
  parseReferenceKey,
  referenceGroupOf,
  referenceQuery,
  referencesMissingData,
  type ReferenceKey,
  type ReferenceKeyOf,
} from "./reference-catalog"

export function ProjectReferentialScreen({
  projectId,
  canManage = true,
}: {
  projectId: string
  canManage?: boolean
}) {
  const t = useTranslations("projectSetup.projectReferential")
  const [readiness, setReadiness] = useState<ProjectSetupReadiness | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const pathname = usePathname()
  const searchParams = useSearchParams()

  const active = parseReferenceKey(searchParams.get(REFERENCE_PARAM))
  const hrefFor = (key: ReferenceKey) => `${pathname}?${referenceQuery(new URLSearchParams(searchParams.toString()), key)}`
  const group = referenceGroupOf(active)

  const fetchReadiness = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const client = getSupabaseBrowserClient()
      const result = await loadProjectSetupReadiness(client, projectId)
      setReadiness(result)
    } catch (err: any) {
      setError(err.message || t("failedToLoad"))
    } finally {
      setLoading(false)
    }
  }, [projectId, t])

  useEffect(() => {
    fetchReadiness()
  }, [fetchReadiness])

  if (loading) return <Skeleton className="h-64 w-full" />

  if (error || !readiness) {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <p className="font-medium">{error || t("unavailable")}</p>
          </div>
          <Button variant="outline" className="mt-4" onClick={fetchReadiness}>
            <RefreshCw className="mr-2 h-4 w-4" /> {t("retry")}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <SetupReadinessPanel readiness={readiness} hrefForReference={hrefFor} />
      <div className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <ReferenceNavigator active={active} missing={referencesMissingData(readiness.missingCodes)} hrefFor={hrefFor} />
        <div className="min-w-0">
          {group === "general" && (
            <GeneralReferences projectId={projectId} canManage={canManage} reference={active as ReferenceKeyOf<"general">} />
          )}
          {group === "welding" && (
            <WeldingReferences projectId={projectId} canManage={canManage} reference={active as ReferenceKeyOf<"welding">} />
          )}
          {group === "testpack" && (
            <TestpackReferences projectId={projectId} canManage={canManage} reference={active as ReferenceKeyOf<"testpack">} />
          )}
          {group === "spooling" && (
            <SpoolingReferences projectId={projectId} canManage={canManage} reference={active as ReferenceKeyOf<"spooling">} />
          )}
        </div>
      </div>
    </div>
  )
}
