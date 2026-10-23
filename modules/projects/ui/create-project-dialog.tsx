"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useSupabaseAuth } from "@/contexts/supabase-auth-context"
import {
  type ProjectCreationInput,
  validateProjectCreation,
} from "@/lib/project-definition"
import {
  copyProjectReferences,
  createProjectDefinition,
  type CreatedProject,
} from "@/lib/supabase/project-definition"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"

type ProjectCreationForm = Omit<ProjectCreationInput, "maxTransitTimeDays"> & {
  maxTransitTimeDays: string
}

const NO_COPY = "none"

const emptyCreationForm: ProjectCreationForm = {
  activityCode: "",
  projectTitle: "",
  owner: "",
  contractor: "",
  contractNumber: "",
  maxTransitTimeDays: "1",
}

/**
 * The one place a project is created. The database decides who may: the INSERT policy on `projects`
 * requires `public.is_platform_admin()`, so callers show the control only to a platform admin.
 */
export function CreateProjectDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: (project: CreatedProject) => void
}) {
  const t = useTranslations("projectSetup.projectDefinition")
  const { user, reloadAccess, selectProject, projectAccesses } = useSupabaseAuth()
  const [form, setForm] = React.useState<ProjectCreationForm>(emptyCreationForm)
  const [errors, setErrors] = React.useState<
    Partial<Record<keyof ProjectCreationInput, string>>
  >({})
  const [isCreating, setIsCreating] = React.useState(false)
  // The project whose referentials the new one starts from; "none" leaves it empty.
  const [copyFrom, setCopyFrom] = React.useState<string>(NO_COPY)

  const update = (patch: Partial<ProjectCreationForm>) =>
    setForm((current) => ({ ...current, ...patch }))

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!user) return

    const validation = validateProjectCreation({
      ...form,
      maxTransitTimeDays: Number(form.maxTransitTimeDays),
    })
    if (!validation.isValid) {
      setErrors(validation.errors)
      return
    }

    setErrors({})
    setIsCreating(true)
    try {
      const created = await createProjectDefinition(
        getSupabaseBrowserClient(),
        user.id,
        validation.value,
      )
      // The creator's Project Admin membership is written by the
      // `projects_add_creator_as_admin` trigger, so the new project only becomes selectable
      // after access is reloaded.
      toast.success(t("created", { title: created.activityCode }))
      if (copyFrom !== NO_COPY) {
        try {
          const rows = await copyProjectReferences(getSupabaseBrowserClient(), copyFrom, created.id)
          toast.success(t("referencesCopied", { count: rows }))
        } catch (copyError) {
          // The project exists and can be filled by hand, so this is a warning, not a failed creation.
          toast.warning(t("copyFailed"), { description: copyError instanceof Error ? copyError.message : undefined })
        }
      }
      reloadAccess()
      selectProject(created.id)
      onOpenChange(false)
      setForm(emptyCreationForm)
      setCopyFrom(NO_COPY)
      onCreated?.(created)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("unableToCreate"))
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t("createProject")}</DialogTitle>
            <DialogDescription>{t("createDialogDesc")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-3">
            <CreationField
              id="cp-activity"
              label={t("activityCode")}
              placeholder={t("activityCodePlaceholder")}
              value={form.activityCode}
              error={errors.activityCode}
              disabled={isCreating}
              onChange={(value) => update({ activityCode: value.toUpperCase() })}
            />
            <CreationField
              id="cp-title"
              label={t("projectTitle")}
              placeholder={t("projectTitlePlaceholder")}
              value={form.projectTitle}
              error={errors.projectTitle}
              disabled={isCreating}
              onChange={(value) => update({ projectTitle: value })}
            />
            <CreationField
              id="cp-owner"
              label={t("owner")}
              placeholder={t("ownerPlaceholder")}
              value={form.owner}
              error={errors.owner}
              disabled={isCreating}
              onChange={(value) => update({ owner: value })}
            />
            <CreationField
              id="cp-contractor"
              label={t("contractor")}
              placeholder={t("contractorPlaceholder")}
              value={form.contractor}
              error={errors.contractor}
              disabled={isCreating}
              onChange={(value) => update({ contractor: value })}
            />
            <CreationField
              id="cp-contract-number"
              label={t("contractNumberOptional")}
              placeholder={t("contractNumberPlaceholder")}
              value={form.contractNumber}
              disabled={isCreating}
              onChange={(value) => update({ contractNumber: value })}
            />
            <CreationField
              id="cp-transit"
              label={t("maxTransitTimeDays")}
              type="number"
              value={form.maxTransitTimeDays}
              error={errors.maxTransitTimeDays}
              disabled={isCreating}
              onChange={(value) => update({ maxTransitTimeDays: value })}
            />
            <div className="grid gap-1.5">
              <Label htmlFor="cp-copy">{t("copyReferences")}</Label>
              <Select value={copyFrom} onValueChange={setCopyFrom} disabled={isCreating}>
                <SelectTrigger id="cp-copy">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_COPY}>{t("copyNone")}</SelectItem>
                  {projectAccesses.map((project) => (
                    <SelectItem key={project.projectId} value={project.projectId}>
                      {project.activityCode} — {project.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{t("copyHint")}</p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isCreating}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? (
                <span className="flex items-center gap-1.5">
                  <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t("saving")}
                </span>
              ) : (
                t("createProject")
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function CreationField({
  id,
  label,
  value,
  onChange,
  disabled,
  error,
  placeholder,
  type,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  disabled: boolean
  error?: string
  placeholder?: string
  type?: string
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        min={type === "number" ? 1 : undefined}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className={error ? "border-destructive" : ""}
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
