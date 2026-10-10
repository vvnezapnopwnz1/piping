"use client"

import { codeLabel } from "@/i18n/translator"
import { useLocale, useTranslations } from "next-intl"
import { Pencil } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { AccessMemberRow } from "../domain/access-rights"

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
  const t = useTranslations("access.membersTable")
  const tc = useTranslations("codes")
  const locale = useLocale()

  const columnHeaders = [
    t("columns.member"),
    t("columns.access"),
    t("columns.functionalRoles"),
    t("columns.subcontractorScope"),
    t("columns.pdsScope"),
    t("columns.status"),
    "",
  ]

  return (
    <div className="overflow-auto rounded-xl border bg-card">
      <table className="w-full min-w-[900px] text-sm">
        <thead className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>{columnHeaders.map((title, idx) => <th key={idx} className="px-3 py-2.5 font-semibold">{title}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isOwnRow = row.userId === currentUserId
            const disabled = saving || (isOwnRow && !isPlatformAdmin)
            return (
              <tr key={row.membershipId} className="border-b last:border-0">
                <td className="px-3 py-2">
                  <div className="font-medium">{row.fullName}</div>
                  <div className="text-xs text-muted-foreground">{row.email}</div>
                </td>
                <td className="px-3 py-2">
                  <Badge variant="outline">{codeLabel(tc, "accessRole", row.accessRole)}</Badge>
                </td>
                <td className="px-3 py-2 text-xs">
                  {locale === "ru"
                    ? row.functionalRoles.map((role) => codeLabel(tc, "functionalRole", role)).join(", ") || "—"
                    : row.functionalRoles.join(", ") || "—"}
                </td>
                <td className="px-3 py-2 text-xs">
                  {row.subcontractorIds.join(", ") || t("projectWide")}
                </td>
                <td className="px-3 py-2 text-xs">
                  {row.pdsAreaIds.join(", ") || t("projectWide")}
                </td>
                <td className="px-3 py-2">
                  <Badge variant={row.isActive ? "default" : "secondary"}>
                    {row.isActive ? tc("status.active") : tc("status.inactive")}
                  </Badge>
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={disabled}
                      title={disabled && isOwnRow ? t("ownMembershipAdminOnly") : undefined}
                      onClick={() => onEdit(row)}
                    >
                      <Pencil className="mr-1 size-3" />
                      {t("actions.edit")}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={disabled}
                      title={disabled && isOwnRow ? t("ownMembershipAdminOnly") : undefined}
                      onClick={() => onSetActive(row, !row.isActive)}
                    >
                      {row.isActive ? t("actions.deactivate") : t("actions.activate")}
                    </Button>
                  </div>
                </td>
              </tr>
            )
          })}
          {rows.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                {t("emptyList")}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  )
}
