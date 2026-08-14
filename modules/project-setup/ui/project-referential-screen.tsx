"use client"

import { useCallback, useEffect, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { AlertCircle, RefreshCw } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SupabaseWpsTab } from "@/components/admin/supabase-wps-tab"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import { loadProjectSetupReadiness } from "../infrastructure/supabase-setup-readiness-repository"
import type { ProjectSetupReadiness } from "../domain/setup-readiness"
import { SetupReadinessPanel } from "./setup-readiness-panel"
import { SystemReferentialScreen } from "./system-referential-screen"
import { ProjectGeographyTabs } from "./project-geography-tabs"
import { WeldingQualityTabs } from "./welding-quality-tabs"
import { ExecutionReferenceTabs } from "./execution-reference-tabs"
import { ExtendedReferenceTabs } from "./extended-reference-tabs"
import { ProgressWeightsScreen } from "./progress-weights-screen"

const TABS = ["general", "fabrication", "testpack", "spooling", "system", "weights"]

export function ProjectReferentialScreen({
  projectId,
  canManage = true,
}: {
  projectId: string
  canManage?: boolean
}) {
  const [readiness, setReadiness] = useState<ProjectSetupReadiness | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // The tab belongs in the address bar. `SetupReadinessPanel` links straight at a referential,
  // and a readiness item that cannot be linked to is a readiness item somebody has to be told how
  // to find. It also makes the back button out of a dialog land on the tab it left.
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activeTab = TABS.includes(searchParams.get("tab") ?? "") ? searchParams.get("tab")! : "general"
  const setActiveTab = useCallback(
    (tab: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (tab === "general") params.delete("tab")
      else params.set("tab", tab)
      const query = params.toString()
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    },
    [pathname, router, searchParams],
  )

  const fetchReadiness = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const client = getSupabaseBrowserClient()
      const result = await loadProjectSetupReadiness(client, projectId)
      setReadiness(result)
    } catch (err: any) {
      setError(err.message || "Failed to load project setup readiness")
    } finally {
      setLoading(false)
    }
  }, [projectId])

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
            <p className="font-medium">{error || "Readiness state unavailable"}</p>
          </div>
          <Button variant="outline" className="mt-4" onClick={fetchReadiness}>
            <RefreshCw className="mr-2 h-4 w-4" /> Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <SetupReadinessPanel readiness={readiness} onNavigateTab={setActiveTab} />

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        variant="underline"
        className="w-full"
      >
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="fabrication">Welding & Quality</TabsTrigger>
          <TabsTrigger value="testpack">Testpack & Tracking</TabsTrigger>
          <TabsTrigger value="spooling">Spooling & Painting</TabsTrigger>
          <TabsTrigger value="system">System Referentials</TabsTrigger>
          <TabsTrigger value="weights">Progress Weights</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6">
          <ProjectGeographyTabs projectId={projectId} canManage={canManage} />
        </TabsContent>

        <TabsContent value="fabrication" className="mt-6 space-y-6">
          <WeldingQualityTabs projectId={projectId} canManage={canManage} />
          {/* WPS is a range qualification with its own optimistic-concurrency contract, so it
              keeps its own editor rather than joining the generic referential tabs above. */}
          <Card>
            <CardHeader>
              <CardTitle>Welding Procedures (WPS)</CardTitle>
            </CardHeader>
            <CardContent>
              <SupabaseWpsTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="testpack" className="mt-6">
          <ExecutionReferenceTabs projectId={projectId} canManage={canManage} />
        </TabsContent>

        <TabsContent value="spooling" className="mt-6">
          <ExtendedReferenceTabs projectId={projectId} canManage={canManage} />
        </TabsContent>

        <TabsContent value="system" className="mt-6">
          <SystemReferentialScreen />
        </TabsContent>

        <TabsContent value="weights" className="mt-6">
          <ProgressWeightsScreen projectId={projectId} canManage={canManage} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
