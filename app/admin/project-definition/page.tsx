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
import { useAdminStore } from "@/store/admin-store";
import { formatDate } from "@/lib/utils";

const ACTIVITY_CODE_RE = /^[A-Z0-9-]+$/;

export default function ProjectDefinitionPage() {
  const projectDefinition = useAdminStore((s) => s.projectDefinition);
  const setProjectDefinition = useAdminStore((s) => s.setProjectDefinition);

  const [activityCode, setActivityCode] = useState(
    projectDefinition.activityCode,
  );
  const [projectTitle, setProjectTitle] = useState(
    projectDefinition.projectTitle,
  );
  const [owner, setOwner] = useState(projectDefinition.owner);
  const [contractor, setContractor] = useState(projectDefinition.contractor);
  const [ownerLogoUrl, setOwnerLogoUrl] = useState(
    projectDefinition.ownerLogoUrl,
  );
  const [contractorLogoUrl, setContractorLogoUrl] = useState(
    projectDefinition.contractorLogoUrl,
  );
  const [maxTransitTimeDays, setMaxTransitTimeDays] = useState(
    String(projectDefinition.maxTransitTimeDays),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [activityError, setActivityError] = useState("");

  useEffect(() => {
    setActivityCode(projectDefinition.activityCode);
    setProjectTitle(projectDefinition.projectTitle);
    setOwner(projectDefinition.owner);
    setContractor(projectDefinition.contractor);
    setOwnerLogoUrl(projectDefinition.ownerLogoUrl);
    setContractorLogoUrl(projectDefinition.contractorLogoUrl);
    setMaxTransitTimeDays(String(projectDefinition.maxTransitTimeDays));
  }, [projectDefinition]);

  const validateActivity = (value: string) => {
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
  };

  const handleSave = async () => {
    if (!validateActivity(activityCode)) return;
    if (!projectTitle.trim()) {
      toast.error("Project title is required");
      return;
    }
    if (!owner.trim() || !contractor.trim()) {
      toast.error("Owner and contractor are required");
      return;
    }
    const transitNum = Number(maxTransitTimeDays);
    if (!Number.isFinite(transitNum) || transitNum < 1) {
      toast.error("Maximum transit time must be ≥ 1 day");
      return;
    }

    setIsSaving(true);
    await new Promise((r) => setTimeout(r, 400 + Math.random() * 200));
    setProjectDefinition({
      activityCode: activityCode.trim(),
      projectTitle: projectTitle.trim(),
      owner: owner.trim(),
      contractor: contractor.trim(),
      ownerLogoUrl: ownerLogoUrl.trim(),
      contractorLogoUrl: contractorLogoUrl.trim(),
      maxTransitTimeDays: transitNum,
    });
    setIsSaving(false);
    toast.success("Project definition saved");
  };

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Admin · Project Definition"
        description="Create and configure project identity, parties, logos, and maximum transit timing."
      />

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base">Currently saved</CardTitle>
          <CardDescription>
            Last updated {formatDate(projectDefinition.updatedAt)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-3">
            <SummaryItem label="Activity Code">
              <span className="font-mono">{projectDefinition.activityCode}</span>
            </SummaryItem>
            <SummaryItem label="Project Title">
              {projectDefinition.projectTitle}
            </SummaryItem>
            <SummaryItem label="Max Transit Time">
              {projectDefinition.maxTransitTimeDays} days
            </SummaryItem>
            <SummaryItem label="Owner">{projectDefinition.owner}</SummaryItem>
            <SummaryItem label="Contractor">
              {projectDefinition.contractor}
            </SummaryItem>
            <SummaryItem label="Owner Logo">
              {projectDefinition.ownerLogoUrl ? (
                <a
                  className="text-sky-600 underline truncate inline-block max-w-full"
                  href={projectDefinition.ownerLogoUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {projectDefinition.ownerLogoUrl}
                </a>
              ) : (
                <span className="text-slate-400">—</span>
              )}
            </SummaryItem>
            <SummaryItem label="Contractor Logo">
              {projectDefinition.contractorLogoUrl ? (
                <a
                  className="text-sky-600 underline truncate inline-block max-w-full"
                  href={projectDefinition.contractorLogoUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {projectDefinition.contractorLogoUrl}
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
            Update identity fields, logos and the maximum transit time used by
            the spool tracking module.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="pd-activity">Activity Code</Label>
              <Input
                id="pd-activity"
                value={activityCode}
                onChange={(e) => {
                  setActivityCode(e.target.value.toUpperCase());
                  if (activityError) validateActivity(e.target.value);
                }}
                onBlur={() => validateActivity(activityCode)}
                placeholder="e.g. PQ-001"
                className={activityError ? "border-red-500" : ""}
              />
              {activityError && (
                <p className="text-xs text-red-500">{activityError}</p>
              )}
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="pd-title">Project Title</Label>
              <Input
                id="pd-title"
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                placeholder="PipeQC Demo Project"
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="pd-owner">Owner</Label>
              <Input
                id="pd-owner"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                placeholder="Owner company"
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="pd-contractor">Contractor</Label>
              <Input
                id="pd-contractor"
                value={contractor}
                onChange={(e) => setContractor(e.target.value)}
                placeholder="EPC contractor"
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="pd-owner-logo">Owner Logo URL</Label>
              <Input
                id="pd-owner-logo"
                type="url"
                value={ownerLogoUrl}
                onChange={(e) => setOwnerLogoUrl(e.target.value)}
                placeholder="https://…"
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="pd-contractor-logo">Contractor Logo URL</Label>
              <Input
                id="pd-contractor-logo"
                type="url"
                value={contractorLogoUrl}
                onChange={(e) => setContractorLogoUrl(e.target.value)}
                placeholder="https://…"
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="pd-transit">Maximum Transit Time (days)</Label>
              <Input
                id="pd-transit"
                type="number"
                min={1}
                value={maxTransitTimeDays}
                onChange={(e) => setMaxTransitTimeDays(e.target.value)}
              />
              <p className="text-[11px] text-slate-500">
                Days before a spool transit is flagged overdue.
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <span className="flex items-center gap-1.5">
                  <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving…
                </span>
              ) : (
                "Save project definition"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
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
