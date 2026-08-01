"use client"
import { useCallback, useState } from "react"
import { useAppMode } from "@/contexts/app-mode-context"
import { useOptionalAccess } from "@/modules/access/ui/access-context"
import { SpoolingImportScreen } from "@/modules/engineering/ui/spooling-import-screen"
import { RevisionWorkbench } from "@/modules/engineering/ui/revision-workbench"
export default function SpoolingImportPage() { const mode = useAppMode(); const access = useOptionalAccess(); const [jobId, setJobId] = useState<string | null>(null); const onApplied = useCallback(() => setJobId(null), []); if (mode === "demo") return <p className="text-sm text-muted-foreground">The SpoolGen import writes durable engineering revisions and is available in Supabase mode only.</p>; const projectId = access?.access.projectId ?? null; if (!projectId) return <p className="text-sm text-muted-foreground">Select a project to import SpoolGen files.</p>; const canManage = access?.can("spooling.manage") ?? false; return <div className="space-y-4"><SpoolingImportScreen projectId={projectId} canManage={canManage} onValidated={setJobId} /><RevisionWorkbench jobId={jobId} canManage={canManage} onApplied={onApplied} /></div> }
