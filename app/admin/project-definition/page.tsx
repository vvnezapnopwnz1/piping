"use client";

import { useEffect, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppMode } from "@/contexts/app-mode-context";
import { useSupabaseAuth } from "@/contexts/supabase-auth-context";
import {
  type ProjectDefinition,
  type ProjectDefinitionInput,
  validateProjectDefinition,
} from "@/lib/project-definition";
import {
  loadProjectDefinition,
  saveProjectDefinition,
} from "@/lib/supabase/project-definition";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { formatDate } from "@/lib/utils";
import { useAdminStore } from "@/store/admin-store";

type ProjectDefinitionForm = Omit<
  ProjectDefinitionInput,
  "maxTransitTimeDays"
> & {
  maxTransitTimeDays: string;
};

const ACTIVITY_CODE_RE = /^[A-Z0-9-]+$/;

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

export default function ProjectDefinitionPage() {
  const appMode = useAppMode();
  const { access, synchronizeProjectDisplay } = useSupabaseAuth();
  const projectDefinition = useAdminStore((s) => s.projectDefinition);
  const setProjectDefinition = useAdminStore((s) => s.setProjectDefinition);

  const [form, setForm] = useState<ProjectDefinitionForm>(() => ({
    activityCode: projectDefinition.activityCode,
    projectTitle: projectDefinition.projectTitle,
    owner: projectDefinition.owner,
    contractor: projectDefinition.contractor,
    ownerLogoUrl: projectDefinition.ownerLogoUrl,
    contractorLogoUrl: projectDefinition.contractorLogoUrl,
    maxTransitTimeDays: String(projectDefinition.maxTransitTimeDays),
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
    if (appMode !== "demo") return;

    setForm({
      activityCode: projectDefinition.activityCode,
      projectTitle: projectDefinition.projectTitle,
      owner: projectDefinition.owner,
      contractor: projectDefinition.contractor,
      ownerLogoUrl: projectDefinition.ownerLogoUrl,
      contractorLogoUrl: projectDefinition.contractorLogoUrl,
      maxTransitTimeDays: String(projectDefinition.maxTransitTimeDays),
    });
  }, [appMode, projectDefinition]);

  useEffect(() => {
    if (appMode !== "supabase" || !access?.projectId) return;

    let isCurrent = true;
    setIsLoading(true);
    setLoadError(false);
    setSupabaseDefinition(null);
    setCanEdit(false);

    void loadProjectDefinition(
      getSupabaseBrowserClient(),
      access.projectId,
    ).then(
      (loaded) => {
        if (!isCurrent) return;

        setSupabaseDefinition(loaded.projectDefinition);
        setForm(toFormValue(loaded.projectDefinition));
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
  }, [appMode, loadAttempt, access?.projectId]);

  const updateForm = <Field extends keyof ProjectDefinitionForm>(
    field: Field,
    value: ProjectDefinitionForm[Field],
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const validateActivity = (value: string) => {
    if (appMode === "demo") {
      if (!value.trim()) {
        setActivityError("Activity code is required");
        return false;
      }
      if (!ACTIVITY_CODE_RE.test(value.trim())) {
        setActivityError("Use uppercase letters, digits and hyphens only");
        return false;
      }
      setActivityError("");
      return true;
    }

    const validation = validateProjectDefinition(
      toProjectDefinitionInput({ ...form, activityCode: value }),
    );
    const nextError = validation.errors.activityCode ?? "";
    setActivityError(nextError);
    return !nextError;
  };

  const handleSave = async () => {
    if (appMode === "demo") {
      if (!validateActivity(form.activityCode)) return;
      if (!form.projectTitle.trim()) {
        toast.error("Project title is required");
        return;
      }
      if (!form.owner.trim() || !form.contractor.trim()) {
        toast.error("Owner and contractor are required");
        return;
      }
      if (
        !Number.isFinite(Number(form.maxTransitTimeDays)) ||
        Number(form.maxTransitTimeDays) < 1
      ) {
        toast.error("Maximum transit time must be ≥ 1 day");
        return;
      }

      setIsSaving(true);
      await new Promise((resolve) => setTimeout(resolve, 400 + Math.random() * 200));
      setProjectDefinition({
        activityCode: form.activityCode.trim(),
        projectTitle: form.projectTitle.trim(),
        owner: form.owner.trim(),
        contractor: form.contractor.trim(),
        ownerLogoUrl: form.ownerLogoUrl.trim(),
        contractorLogoUrl: form.contractorLogoUrl.trim(),
        maxTransitTimeDays: Number(form.maxTransitTimeDays),
      });
      setIsSaving(false);
      toast.success("Project definition saved");
      return;
    }

    if (!access?.projectId || !canEdit) return;

    const validation = validateProjectDefinition(toProjectDefinitionInput(form));
    if (!validation.isValid) {
      setActivityError(validation.errors.activityCode ?? "");
      toast.error("Please correct the project definition fields");
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
      toast.success("Project definition saved");
    } catch {
      toast.error("Unable to save project definition. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const displayedDefinition =
    appMode === "demo" ? projectDefinition : supabaseDefinition;
  const isReadOnly = appMode === "supabase" && !canEdit;

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Admin · Project Definition"
        description="Create and configure project identity, parties, logos, and maximum transit timing."
      />

      {appMode === "supabase" && isLoading ? (
        <ProjectDefinitionMessage
          title="Loading project definition"
          description="Retrieving the current project settings."
        />
      ) : null}

      {appMode === "supabase" && loadError ? (
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base">Unable to load project definition</CardTitle>
            <CardDescription>
              Please try again. If the problem persists, contact your project administrator.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLoadAttempt((attempt) => attempt + 1)}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {displayedDefinition ? (
        <>
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-base">Currently saved</CardTitle>
              <CardDescription>
                Last updated {formatDate(displayedDefinition.updatedAt)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-3">
                <SummaryItem label="Activity Code">
                  <span className="font-mono">{displayedDefinition.activityCode}</span>
                </SummaryItem>
                <SummaryItem label="Project Title">
                  {displayedDefinition.projectTitle}
                </SummaryItem>
                <SummaryItem label="Max Transit Time">
                  {displayedDefinition.maxTransitTimeDays} days
                </SummaryItem>
                <SummaryItem label="Owner">{displayedDefinition.owner}</SummaryItem>
                <SummaryItem label="Contractor">
                  {displayedDefinition.contractor}
                </SummaryItem>
                <SummaryItem label="Owner Logo">
                  {displayedDefinition.ownerLogoUrl ? (
                    <a
                      className="text-sky-600 underline truncate inline-block max-w-full"
                      href={displayedDefinition.ownerLogoUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {displayedDefinition.ownerLogoUrl}
                    </a>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </SummaryItem>
                <SummaryItem label="Contractor Logo">
                  {displayedDefinition.contractorLogoUrl ? (
                    <a
                      className="text-sky-600 underline truncate inline-block max-w-full"
                      href={displayedDefinition.contractorLogoUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {displayedDefinition.contractorLogoUrl}
                    </a>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </SummaryItem>
              </dl>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-base">Edit project record</CardTitle>
              <CardDescription>
                {isReadOnly
                  ? "You have read-only access to this project definition."
                  : "Update identity fields, logos and the maximum transit time used by the spool tracking module."}
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
              />

              {!isReadOnly ? (
                <div className="mt-6 flex justify-end">
                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <SavingLabel /> : "Save project definition"}
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </>
      ) : null}
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
    <Card className="border-slate-200">
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
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="grid gap-1.5">
        <Label htmlFor="pd-activity">Activity Code</Label>
        <Input
          id="pd-activity"
          value={form.activityCode}
          onChange={(event) => onActivityChange(event.target.value)}
          onBlur={onActivityBlur}
          placeholder="e.g. PQ-001"
          className={activityError ? "border-red-500" : ""}
          disabled={disabled}
        />
        {activityError ? <p className="text-xs text-red-500">{activityError}</p> : null}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="pd-title">Project Title</Label>
        <Input
          id="pd-title"
          value={form.projectTitle}
          onChange={(event) => onChange("projectTitle", event.target.value)}
          placeholder="PipeQC Demo Project"
          disabled={disabled}
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="pd-owner">Owner</Label>
        <Input
          id="pd-owner"
          value={form.owner}
          onChange={(event) => onChange("owner", event.target.value)}
          placeholder="Owner company"
          disabled={disabled}
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="pd-contractor">Contractor</Label>
        <Input
          id="pd-contractor"
          value={form.contractor}
          onChange={(event) => onChange("contractor", event.target.value)}
          placeholder="EPC contractor"
          disabled={disabled}
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="pd-owner-logo">Owner Logo URL</Label>
        <Input
          id="pd-owner-logo"
          type="url"
          value={form.ownerLogoUrl}
          onChange={(event) => onChange("ownerLogoUrl", event.target.value)}
          placeholder="https://…"
          disabled={disabled}
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="pd-contractor-logo">Contractor Logo URL</Label>
        <Input
          id="pd-contractor-logo"
          type="url"
          value={form.contractorLogoUrl}
          onChange={(event) => onChange("contractorLogoUrl", event.target.value)}
          placeholder="https://…"
          disabled={disabled}
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="pd-transit">Maximum Transit Time (days)</Label>
        <Input
          id="pd-transit"
          type="number"
          min={1}
          value={form.maxTransitTimeDays}
          onChange={(event) => onChange("maxTransitTimeDays", event.target.value)}
          disabled={disabled}
        />
        <p className="text-[11px] text-slate-500">
          Days before a spool transit is flagged overdue.
        </p>
      </div>
    </div>
  );
}

function SavingLabel() {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      Saving…
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
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <dt className="text-[11px] uppercase tracking-wider text-slate-500">
        {label}
      </dt>
      <dd className="mt-0.5 text-xs text-slate-800 break-words">{children}</dd>
    </div>
  );
}
