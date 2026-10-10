"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { toast } from "sonner";

import { AdminPageHeader } from "@/components/admin/admin-module-ui";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSupabaseAuth } from "@/contexts/supabase-auth-context";
import {
  type ProjectCreationInput,
  type ProjectDefinition,
  type ProjectDefinitionInput,
  validateProjectCreation,
  validateProjectDefinition,
} from "@/lib/project-definition";
import {
  createProjectDefinition,
  loadProjectDefinition,
  saveProjectDefinition,
} from "@/lib/supabase/project-definition";
import {
  uploadProjectLogo,
  getProjectLogoSignedUrl,
} from "@/modules/project-setup/infrastructure/supabase-project-branding";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { formatDate } from "@/lib/utils";

type ProjectDefinitionForm = Omit<
  ProjectDefinitionInput,
  "maxTransitTimeDays"
> & {
  maxTransitTimeDays: string;
};

function toFormValue(definition: ProjectDefinition): ProjectDefinitionForm {
  return {
    activityCode: definition.activityCode,
    projectTitle: definition.projectTitle,
    owner: definition.owner,
    contractor: definition.contractor,
    ownerLogoUrl: definition.ownerLogoUrl,
    contractorLogoUrl: definition.contractorLogoUrl,
    maxTransitTimeDays: String(definition.maxTransitTimeDays),
  };
}

function toProjectDefinitionInput(
  form: ProjectDefinitionForm,
): ProjectDefinitionInput {
  return {
    ...form,
    maxTransitTimeDays: Number(form.maxTransitTimeDays),
  };
}

type ProjectCreationForm = Omit<ProjectCreationInput, "maxTransitTimeDays"> & {
  maxTransitTimeDays: string;
};

const emptyCreationForm: ProjectCreationForm = {
  activityCode: "",
  projectTitle: "",
  owner: "",
  contractor: "",
  contractNumber: "",
  maxTransitTimeDays: "1",
};

export default function ProjectDefinitionPage() {
  const t = useTranslations("projectSetup.projectDefinition");

  const { access, user, reloadAccess, selectProject, synchronizeProjectDisplay } =
    useSupabaseAuth();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] =
    useState<ProjectCreationForm>(emptyCreationForm);
  const [createErrors, setCreateErrors] = useState<
    Partial<Record<keyof ProjectCreationInput, string>>
  >({});
  const [isCreating, setIsCreating] = useState(false);

  // Project creation is a platform-admin action: the INSERT policy on `projects` requires
  // `public.is_platform_admin()`, so showing the control to anyone else would only produce a
  // permission error.
  const canCreateProject = access?.isPlatformAdmin === true;

  const [form, setForm] = useState<ProjectDefinitionForm>(() => ({
    activityCode: "",
    projectTitle: "",
    owner: "",
    contractor: "",
    ownerLogoUrl: "",
    contractorLogoUrl: "",
    maxTransitTimeDays: "1",
  }));
  const [isSaving, setIsSaving] = useState(false);
  const [activityError, setActivityError] = useState("");
  const [supabaseDefinition, setSupabaseDefinition] =
    useState<ProjectDefinition | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    if (!access?.projectId) return;

    let isCurrent = true;
    setIsLoading(true);
    setLoadError(false);
    setSupabaseDefinition(null);
    setCanEdit(false);

    void loadProjectDefinition(
      getSupabaseBrowserClient(),
      access.projectId,
    ).then(
      async (loaded) => {
        if (!isCurrent) return;

        const client = getSupabaseBrowserClient();
        const [ownerSigned, contractorSigned] = await Promise.all([
          getProjectLogoSignedUrl(client, loaded.projectDefinition.ownerLogoUrl),
          getProjectLogoSignedUrl(client, loaded.projectDefinition.contractorLogoUrl),
        ]);

        if (!isCurrent) return;
        const displayDefinition = {
          ...loaded.projectDefinition,
          ownerLogoUrl: ownerSigned || loaded.projectDefinition.ownerLogoUrl,
          contractorLogoUrl: contractorSigned || loaded.projectDefinition.contractorLogoUrl,
        };
        setSupabaseDefinition(displayDefinition);
        setForm(toFormValue(displayDefinition));
        setCanEdit(loaded.canEdit);
        setIsLoading(false);
      },
      () => {
        if (!isCurrent) return;

        setLoadError(true);
        setIsLoading(false);
      },
    );

    return () => {
      isCurrent = false;
    };
  }, [loadAttempt, access?.projectId]);

  const updateForm = <Field extends keyof ProjectDefinitionForm>(
    field: Field,
    value: ProjectDefinitionForm[Field],
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const validateActivity = (value: string) => {
    const validation = validateProjectDefinition(
      toProjectDefinitionInput({ ...form, activityCode: value }),
    );
    const nextError = validation.errors.activityCode ?? "";
    setActivityError(nextError);
    return !nextError;
  };

  const handleSave = async () => {
    if (!access?.projectId || !canEdit) return;

    const validation = validateProjectDefinition(toProjectDefinitionInput(form));
    if (!validation.isValid) {
      setActivityError(validation.errors.activityCode ?? "");
      toast.error(t("correctFields"));
      return;
    }

    setIsSaving(true);
    try {
      const saved = await saveProjectDefinition(
        getSupabaseBrowserClient(),
        access.projectId,
        validation.value,
      );
      setSupabaseDefinition(saved);
      setForm(toFormValue(saved));
      synchronizeProjectDisplay(access.projectId, {
        activityCode: saved.activityCode,
        title: saved.projectTitle,
      });
      setActivityError("");
      toast.success(t("saved"));
    } catch {
      toast.error(t("unableToSave"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateProject = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;

    const validation = validateProjectCreation({
      ...createForm,
      maxTransitTimeDays: Number(createForm.maxTransitTimeDays),
    });

    if (!validation.isValid) {
      setCreateErrors(validation.errors);
      return;
    }

    setCreateErrors({});
    setIsCreating(true);
    try {
      const created = await createProjectDefinition(
        getSupabaseBrowserClient(),
        user.id,
        validation.value,
      );
      // The creator's Project Admin membership is written by the
      // `projects_add_creator_as_admin` trigger, so the new project only becomes selectable
      // after access is reloaded.
      reloadAccess();
      selectProject(created.id);
      setIsCreateOpen(false);
      setCreateForm(emptyCreationForm);
      toast.success(t("created", { title: created.activityCode }));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("unableToCreate"),
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleUploadLogo = async (brandType: "owner" | "contractor", file: File) => {
    if (!access?.projectId) return;
    try {
      const client = getSupabaseBrowserClient();
      const res = await uploadProjectLogo(client, access.projectId, brandType, file);
      toast.success(t("logoUploaded", { role: brandType === "owner" ? t("owner") : t("contractor") }));
      if (brandType === "owner") {
        updateForm("ownerLogoUrl", res.signedUrl);
      } else {
        updateForm("contractorLogoUrl", res.signedUrl);
      }
    } catch (err: any) {
      toast.error(err.message || t("failedToUploadLogo"));
    }
  };

  const displayedDefinition = supabaseDefinition;
  const isReadOnly = !canEdit;

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title={t("headerTitle")}
        description={t("headerDesc")}
      />

      {canCreateProject ? (
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">{t("newProjectTitle")}</CardTitle>
              <CardDescription>
                {t("newProjectDesc")}
              </CardDescription>
            </div>
            <Button onClick={() => setIsCreateOpen(true)}>{t("createProject")}</Button>
          </CardHeader>
        </Card>
      ) : null}

      {isLoading ? (
        <ProjectDefinitionMessage
          title={t("loadingTitle")}
          description={t("loadingDesc")}
        />
      ) : null}

      {loadError ? (
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base">{t("unableToLoadTitle")}</CardTitle>
            <CardDescription>
              {t("unableToLoadDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLoadAttempt((attempt) => attempt + 1)}>
              {t("retry")}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {displayedDefinition ? (
        <>
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-base">{t("currentlySaved")}</CardTitle>
              <CardDescription>
                {t("lastUpdated", { time: formatDate(displayedDefinition.updatedAt) })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-3">
                <SummaryItem label={t("activityCode")}>
                  <span className="font-mono">{displayedDefinition.activityCode}</span>
                </SummaryItem>
                <SummaryItem label={t("projectTitle")}>
                  {displayedDefinition.projectTitle}
                </SummaryItem>
                <SummaryItem label={t("maxTransitTime")}>
                  {t("daysCount", { count: displayedDefinition.maxTransitTimeDays })}
                </SummaryItem>
                <SummaryItem label={t("owner")}>{displayedDefinition.owner}</SummaryItem>
                <SummaryItem label={t("contractor")}>
                  {displayedDefinition.contractor}
                </SummaryItem>
                <SummaryItem label={t("ownerLogo")}>
                  {displayedDefinition.ownerLogoUrl ? (
                    <a
                      className="text-primary underline truncate inline-block max-w-full"
                      href={displayedDefinition.ownerLogoUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {displayedDefinition.ownerLogoUrl}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </SummaryItem>
                <SummaryItem label={t("contractorLogo")}>
                  {displayedDefinition.contractorLogoUrl ? (
                    <a
                      className="text-primary underline truncate inline-block max-w-full"
                      href={displayedDefinition.contractorLogoUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {displayedDefinition.contractorLogoUrl}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </SummaryItem>
              </dl>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-base">{t("editProjectRecord")}</CardTitle>
              <CardDescription>
                {isReadOnly
                  ? t("readOnlyNotice")
                  : t("editNotice")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProjectDefinitionFields
                activityError={activityError}
                disabled={isReadOnly || isSaving}
                form={form}
                onActivityBlur={() => validateActivity(form.activityCode)}
                onActivityChange={(value) => {
                  updateForm("activityCode", value.toUpperCase());
                  if (activityError) validateActivity(value);
                }}
                onChange={updateForm}
                onUploadLogo={handleUploadLogo}
              />

              {!isReadOnly ? (
                <div className="mt-6 flex justify-end">
                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <SavingLabel text={t("saving")} /> : t("saveProjectDefinition")}
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </>
      ) : null}

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <form onSubmit={handleCreateProject}>
            <DialogHeader>
              <DialogTitle>{t("createProject")}</DialogTitle>
              <DialogDescription>
                {t("createDialogDesc")}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-3">
              <CreationField
                id="cp-activity"
                label={t("activityCode")}
                placeholder={t("activityCodePlaceholder")}
                value={createForm.activityCode}
                error={createErrors.activityCode}
                disabled={isCreating}
                onChange={(value) =>
                  setCreateForm((current) => ({
                    ...current,
                    activityCode: value.toUpperCase(),
                  }))
                }
              />
              <CreationField
                id="cp-title"
                label={t("projectTitle")}
                placeholder={t("projectTitlePlaceholder")}
                value={createForm.projectTitle}
                error={createErrors.projectTitle}
                disabled={isCreating}
                onChange={(value) =>
                  setCreateForm((current) => ({ ...current, projectTitle: value }))
                }
              />
              <CreationField
                id="cp-owner"
                label={t("owner")}
                placeholder={t("ownerPlaceholder")}
                value={createForm.owner}
                error={createErrors.owner}
                disabled={isCreating}
                onChange={(value) =>
                  setCreateForm((current) => ({ ...current, owner: value }))
                }
              />
              <CreationField
                id="cp-contractor"
                label={t("contractor")}
                placeholder={t("contractorPlaceholder")}
                value={createForm.contractor}
                error={createErrors.contractor}
                disabled={isCreating}
                onChange={(value) =>
                  setCreateForm((current) => ({ ...current, contractor: value }))
                }
              />
              <CreationField
                id="cp-contract-number"
                label={t("contractNumberOptional")}
                placeholder="e.g. C-1"
                value={createForm.contractNumber}
                disabled={isCreating}
                onChange={(value) =>
                  setCreateForm((current) => ({ ...current, contractNumber: value }))
                }
              />
              <CreationField
                id="cp-transit"
                label={t("maxTransitTimeDays")}
                type="number"
                value={createForm.maxTransitTimeDays}
                error={createErrors.maxTransitTimeDays}
                disabled={isCreating}
                onChange={(value) =>
                  setCreateForm((current) => ({
                    ...current,
                    maxTransitTimeDays: value,
                  }))
                }
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                disabled={isCreating}
              >
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? <SavingLabel text={t("saving")} /> : t("createProject")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
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
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  error?: string;
  placeholder?: string;
  type?: string;
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
  );
}

function ProjectDefinitionMessage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  );
}

function ProjectDefinitionFields({
  activityError,
  disabled,
  form,
  onActivityBlur,
  onActivityChange,
  onChange,
  onUploadLogo,
}: {
  activityError: string;
  disabled: boolean;
  form: ProjectDefinitionForm;
  onActivityBlur: () => void;
  onActivityChange: (value: string) => void;
  onChange: <Field extends keyof ProjectDefinitionForm>(
    field: Field,
    value: ProjectDefinitionForm[Field],
  ) => void;
  onUploadLogo?: (brandType: "owner" | "contractor", file: File) => Promise<void>;
}) {
  const t = useTranslations("projectSetup.projectDefinition");
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="grid gap-1.5">
        <Label htmlFor="pd-activity">{t("activityCode")}</Label>
        <Input
          id="pd-activity"
          value={form.activityCode}
          onChange={(event) => onActivityChange(event.target.value)}
          onBlur={onActivityBlur}
          placeholder={t("editActivityPlaceholder")}
          className={activityError ? "border-destructive" : ""}
          disabled={disabled}
        />
        {activityError ? <p className="text-xs text-destructive">{activityError}</p> : null}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="pd-title">{t("projectTitle")}</Label>
        <Input
          id="pd-title"
          value={form.projectTitle}
          onChange={(event) => onChange("projectTitle", event.target.value)}
          placeholder={t("editTitlePlaceholder")}
          disabled={disabled}
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="pd-owner">{t("owner")}</Label>
        <Input
          id="pd-owner"
          value={form.owner}
          onChange={(event) => onChange("owner", event.target.value)}
          placeholder={t("ownerPlaceholder")}
          disabled={disabled}
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="pd-contractor">{t("contractor")}</Label>
        <Input
          id="pd-contractor"
          value={form.contractor}
          onChange={(event) => onChange("contractor", event.target.value)}
          placeholder={t("contractorPlaceholder")}
          disabled={disabled}
        />
      </div>

      <>
          <div className="grid gap-1.5">
            <Label htmlFor="pd-owner-logo-file">{t("ownerLogoUpload")}</Label>
            <Input
              id="pd-owner-logo-file"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              disabled={disabled}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file && onUploadLogo) {
                  onUploadLogo("owner", file);
                }
              }}
            />
            {form.ownerLogoUrl && (
              <p className="text-xs text-muted-foreground truncate">{t("currentLogo", { name: form.ownerLogoUrl })}</p>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="pd-contractor-logo-file">{t("contractorLogoUpload")}</Label>
            <Input
              id="pd-contractor-logo-file"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              disabled={disabled}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file && onUploadLogo) {
                  onUploadLogo("contractor", file);
                }
              }}
            />
            {form.contractorLogoUrl && (
              <p className="text-xs text-muted-foreground truncate">{t("currentLogo", { name: form.contractorLogoUrl })}</p>
            )}
          </div>
      </>

      <div className="grid gap-1.5">
        <Label htmlFor="pd-transit">{t("maxTransitTimeDays")}</Label>
        <Input
          id="pd-transit"
          type="number"
          min={1}
          value={form.maxTransitTimeDays}
          onChange={(event) => onChange("maxTransitTimeDays", event.target.value)}
          disabled={disabled}
        />
        <p className="text-[11px] text-muted-foreground">
          {t("maxTransitDaysHint")}
        </p>
      </div>
    </div>
  );
}

function SavingLabel({ text }: { text?: string }) {
  const t = useTranslations("projectSetup.projectDefinition");
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      {text ?? t("saving")}
    </span>
  );
}

function SummaryItem({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted px-3 py-2">
      <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 text-xs text-foreground break-words">{children}</dd>
    </div>
  );
}
