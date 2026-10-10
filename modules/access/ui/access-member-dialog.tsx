"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { codeLabel } from "@/i18n/translator"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FUNCTIONAL_ROLES, PROJECT_ACCESS_ROLES, type FunctionalRole, type ProjectAccessRole } from "../domain/capability"
import {
  validateAccessMemberInput,
  type AccessMemberField,
  type AccessMemberInput,
  type AccessMemberIssueCode,
  type AccessMemberRow,
} from "../domain/access-rights"
import type { AccessScopeOption } from "../infrastructure/supabase-access-rights-repository"
import {
  shouldCloseAccessMemberDialog,
  type AccessMemberSaveState,
} from "./access-member-dialog-state"

const emptyInput: AccessMemberInput = { accessRole: "project_reader", functionalRoles: [], subcontractorIds: [], pdsAreaIds: [] }
function toggle(values: string[], value: string): string[] { return values.includes(value) ? values.filter((item) => item !== value) : [...values, value] }

function formatAccessIssue(
  t: ReturnType<typeof useTranslations<"access.memberDialog">>,
  issue: AccessMemberIssueCode | undefined,
): string | undefined {
  if (!issue) return undefined
  switch (issue) {
    case "at_least_one_functional_role":
      return t("validation.atLeastOneFunctionalRole")
    case "at_least_one_subcontractor":
      return t("validation.atLeastOneSubcontractor")
    case "at_least_one_pds_area":
      return t("validation.atLeastOnePdsArea")
  }
}

export function AccessMemberDialog({ open, member, subcontractors, pdsAreas, saving, onOpenChange, onSave }: { open: boolean; member: AccessMemberRow | null; subcontractors: AccessScopeOption[]; pdsAreas: AccessScopeOption[]; saving: boolean; onOpenChange: (open: boolean) => void; onSave: (email: string, input: AccessMemberInput) => Promise<AccessMemberSaveState> }) {
  const t = useTranslations("access.memberDialog")
  const tc = useTranslations("codes")
  const tCommon = useTranslations("common")

  const [email, setEmail] = React.useState("")
  const [input, setInput] = React.useState<AccessMemberInput>(emptyInput)
  const [fieldErrors, setFieldErrors] = React.useState<Partial<Record<AccessMemberField, AccessMemberIssueCode>>>({})
  React.useEffect(() => { setEmail(member?.email ?? ""); setInput(member ? { accessRole: member.accessRole, functionalRoles: member.functionalRoles, subcontractorIds: member.subcontractorIds, pdsAreaIds: member.pdsAreaIds } : emptyInput); setFieldErrors({}) }, [member, open])
  const setAccessRole = (accessRole: ProjectAccessRole) => setInput((current) => ({ ...current, accessRole, ...(accessRole === "subcontractor" ? {} : { subcontractorIds: [], pdsAreaIds: [] }) }))
  const submit = async () => { const result = validateAccessMemberInput(input); if (!result.ok) { setFieldErrors(result.fieldErrors); return }; const saveState = await onSave(email, result.value); if (shouldCloseAccessMemberDialog(saveState)) onOpenChange(false) }
  const scope = input.accessRole === "subcontractor"

  const functionalRoleLabels = React.useMemo(
    () =>
      Object.fromEntries(
        FUNCTIONAL_ROLES.map((role) => [
          role,
          codeLabel(tc, "functionalRole", role),
        ]),
      ),
    [tc],
  )

  const subcontractorLabels = React.useMemo(
    () =>
      Object.fromEntries(
        subcontractors.map((item) => [
          item.id,
          `${item.code} — ${item.description}`,
        ]),
      ),
    [subcontractors],
  )

  const pdsAreaLabels = React.useMemo(
    () =>
      Object.fromEntries(
        pdsAreas.map((item) => [item.id, `${item.code} — ${item.description}`]),
      ),
    [pdsAreas],
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{member ? t("editTitle") : t("addTitle")}</DialogTitle>
          <DialogDescription>
            {member ? member.email : t("addDescription")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {!member ? (
            <div className="space-y-1">
              <Label htmlFor="member-email">{t("email")}</Label>
              <Input
                id="member-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
          ) : null}
          <div className="space-y-1">
            <Label>{t("accessRole")}</Label>
            <Select
              value={input.accessRole}
              onValueChange={(value) => setAccessRole(value as ProjectAccessRole)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_ACCESS_ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {codeLabel(tc, "accessRole", role)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <ScopeList
            label={t("functionalRoles")}
            values={input.functionalRoles}
            options={FUNCTIONAL_ROLES}
            labels={functionalRoleLabels}
            onToggle={(role) =>
              setInput((current) => ({
                ...current,
                functionalRoles: toggle(
                  current.functionalRoles,
                  role,
                ) as FunctionalRole[],
              }))
            }
            error={formatAccessIssue(t, fieldErrors.functionalRoles)}
          />
          {scope ? (
            <>
              <ScopeList
                label={t("subcontractorScope")}
                values={input.subcontractorIds}
                options={subcontractors.map((item) => item.id)}
                labels={subcontractorLabels}
                onToggle={(id) =>
                  setInput((current) => ({
                    ...current,
                    subcontractorIds: toggle(current.subcontractorIds, id),
                  }))
                }
                error={formatAccessIssue(t, fieldErrors.subcontractorIds)}
              />
              <ScopeList
                label={t("pdsScope")}
                values={input.pdsAreaIds}
                options={pdsAreas.map((item) => item.id)}
                labels={pdsAreaLabels}
                onToggle={(id) =>
                  setInput((current) => ({
                    ...current,
                    pdsAreaIds: toggle(current.pdsAreaIds, id),
                  }))
                }
                error={formatAccessIssue(t, fieldErrors.pdsAreaIds)}
              />
            </>
          ) : null}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            {tCommon("actions.cancel")}
          </Button>
          <Button onClick={() => void submit()} loading={saving}>
            {tCommon("actions.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ScopeList({
  label,
  values,
  options,
  labels,
  onToggle,
  error,
}: {
  label: string
  values: readonly string[]
  options: readonly string[]
  labels?: Record<string, string>
  onToggle: (value: string) => void
  error?: string
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="grid gap-2 rounded-md border p-3">
        {options.map((option) => (
          <label key={option} className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={values.includes(option)}
              onCheckedChange={() => onToggle(option)}
            />
            <span>{labels?.[option] ?? option.replaceAll("_", " ")}</span>
          </label>
        ))}
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}
