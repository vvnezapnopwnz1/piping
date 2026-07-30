"use client"

import { Pencil } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { AccessMemberRow } from "../domain/access-rights"

const ACCESS_LABELS: Record<string, string> = {
  project_admin: "Project Admin",
  site_admin: "Site Admin",
  project_editor: "Project Editor",
  subcontractor: "Subcontractor",
  project_reader: "Project Reader",
}

export function AccessMembersTable({
  rows,
  currentUserId,
  isPlatformAdmin,
  saving,
  onEdit,
  onSetActive,
}: {
  rows: AccessMemberRow[]
  currentUserId: string | undefined
  isPlatformAdmin: boolean
  saving: boolean
  onEdit: (row: AccessMemberRow) => void
  onSetActive: (row: AccessMemberRow, active: boolean) => void
}) {
  return (
    <div className="overflow-auto rounded-xl border bg-card">
      <table className="w-full min-w-[900px] text-sm">
        <thead className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>{["Member", "Access", "Functional roles", "Subcontractor scope", "PDS scope", "Status", ""].map((title) => <th key={title} className="px-3 py-2.5 font-semibold">{title}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isOwnRow = row.userId === currentUserId
            const disabled = saving || (isOwnRow && !isPlatformAdmin)
            return <tr key={row.membershipId} className="border-b last:border-0">
              <td className="px-3 py-2"><div className="font-medium">{row.fullName}</div><div className="text-xs text-muted-foreground">{row.email}</div></td>
              <td className="px-3 py-2"><Badge variant="outline">{ACCESS_LABELS[row.accessRole]}</Badge></td>
              <td className="px-3 py-2 text-xs">{row.functionalRoles.join(", ") || "—"}</td>
              <td className="px-3 py-2 text-xs">{row.subcontractorIds.join(", ") || "Project-wide"}</td>
              <td className="px-3 py-2 text-xs">{row.pdsAreaIds.join(", ") || "Project-wide"}</td>
              <td className="px-3 py-2"><Badge variant={row.isActive ? "default" : "secondary"}>{row.isActive ? "Active" : "Inactive"}</Badge></td>
              <td className="px-3 py-2 text-right"><div className="flex justify-end gap-1"><Button size="sm" variant="outline" disabled={disabled} title={disabled && isOwnRow ? "Only a platform administrator can change their own membership." : undefined} onClick={() => onEdit(row)}><Pencil className="mr-1 size-3" />Edit</Button><Button size="sm" variant="ghost" disabled={disabled} title={disabled && isOwnRow ? "Only a platform administrator can change their own membership." : undefined} onClick={() => onSetActive(row, !row.isActive)}>{row.isActive ? "Deactivate" : "Activate"}</Button></div></td>
            </tr>
          })}
          {rows.length === 0 ? <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">No project memberships found.</td></tr> : null}
        </tbody>
      </table>
    </div>
  )
}
