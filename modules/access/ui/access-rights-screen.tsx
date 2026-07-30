"use client"

import * as React from "react"
import { Plus } from "lucide-react"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import { createRequestVersion } from "@/lib/request-version"
import { useSupabaseAuth } from "@/contexts/supabase-auth-context"
import type { AccessMemberInput, AccessMemberRow } from "../domain/access-rights"
import { addProjectMember, loadProjectAccessMatrix, loadProjectAccessScopeOptions, setProjectMemberActive, updateProjectMember, type AccessScopeOption } from "../infrastructure/supabase-access-rights-repository"
import { AccessMemberDialog } from "./access-member-dialog"
import { AccessMembersTable } from "./access-members-table"
import type { AccessMemberSaveState } from "./access-member-dialog-state"

export function AccessRightsScreen({ projectId, isPlatformAdmin }: { projectId: string; isPlatformAdmin: boolean }) {
  const { user, reloadAccess } = useSupabaseAuth()
  const requestVersion = React.useRef(createRequestVersion())
  const [rows, setRows] = React.useState<AccessMemberRow[]>([])
  const [subcontractors, setSubcontractors] = React.useState<AccessScopeOption[]>([])
  const [pdsAreas, setPdsAreas] = React.useState<AccessScopeOption[]>([])
  const [status, setStatus] = React.useState<"loading" | "load_error" | "ready">("loading")
  const [saving, setSaving] = React.useState(false)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<AccessMemberRow | null>(null)
  const load = React.useCallback(async () => { const token = requestVersion.current.start(); setStatus("loading"); try { const [matrix, options] = await Promise.all([loadProjectAccessMatrix(getSupabaseBrowserClient(), projectId), loadProjectAccessScopeOptions(getSupabaseBrowserClient(), projectId)]); if (!token.isCurrent()) return; setRows(matrix); setSubcontractors(options.subcontractors); setPdsAreas(options.pdsAreas); setStatus("ready") } catch { if (token.isCurrent()) setStatus("load_error") } }, [projectId])
  React.useEffect(() => { void load(); return () => requestVersion.current.invalidate() }, [load])
  const save = async (
    email: string,
    input: AccessMemberInput,
  ): Promise<AccessMemberSaveState> => {
    setSaving(true)
    try {
      if (editing) {
        await updateProjectMember(getSupabaseBrowserClient(), editing.membershipId, input)
      } else {
        await addProjectMember(getSupabaseBrowserClient(), projectId, email, input)
      }
      await load()
      reloadAccess()
      toast.success(editing ? "Access updated" : "Member added")
      return "saved"
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update access")
      return "failed"
    } finally {
      setSaving(false)
    }
  }
  const setActive = async (row: AccessMemberRow, active: boolean) => { setSaving(true); try { await setProjectMemberActive(getSupabaseBrowserClient(), row.membershipId, active); await load(); reloadAccess(); toast.success(active ? "Member activated" : "Member deactivated") } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to update access") } finally { setSaving(false) } }
  if (status === "loading") return <p className="text-sm text-muted-foreground">Loading access matrix…</p>
  if (status === "load_error") return <Alert variant="destructive"><AlertTitle>Unable to load access matrix</AlertTitle><AlertDescription>Check your access or retry the page.</AlertDescription></Alert>
  return <div className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm text-muted-foreground">Manage existing PipeQC users, their access roles, functional roles and explicit scope.</p><Button size="sm" onClick={() => { setEditing(null); setDialogOpen(true) }} disabled={saving}><Plus className="mr-1 size-4" />Add member</Button></div><AccessMembersTable rows={rows} currentUserId={user?.id} isPlatformAdmin={isPlatformAdmin} saving={saving} onEdit={(row) => { setEditing(row); setDialogOpen(true) }} onSetActive={setActive} /><AccessMemberDialog open={dialogOpen} member={editing} subcontractors={subcontractors} pdsAreas={pdsAreas} saving={saving} onOpenChange={setDialogOpen} onSave={save} /></div>
}
