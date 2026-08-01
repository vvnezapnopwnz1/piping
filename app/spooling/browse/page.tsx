"use client"
import { useAppMode } from "@/contexts/app-mode-context"
import { useOptionalAccess } from "@/modules/access/ui/access-context"
import { EngineeringBrowser } from "@/modules/engineering/ui/engineering-browser"
export default function SpoolingBrowsePage() { const mode = useAppMode(); const access = useOptionalAccess(); if (mode === "demo") return <p className="text-sm text-muted-foreground">Browse reads durable engineering definitions and is available in Supabase mode only.</p>; const projectId = access?.access.projectId ?? null; return projectId ? <div className="space-y-4"><h2 className="text-lg font-semibold">Browse</h2><EngineeringBrowser projectId={projectId} refreshToken={0} /></div> : <p className="text-sm text-muted-foreground">Select a project to browse engineering data.</p> }
