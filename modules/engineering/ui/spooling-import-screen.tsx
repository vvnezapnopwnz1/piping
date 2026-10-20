"use client";

import { useTranslations } from "next-intl";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StoredImportIssue } from "@/modules/imports/domain/stored-import-issue";
import { ImportIssueList } from "@/modules/imports/ui/import-issue-list";
import { errorDetail } from "@/i18n/format";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { buildSpoolgenSubmission } from "../application/import-spooling";
import {
  checkFileSize,
  describeFileSet,
  SPOOLGEN_FILE_ROLES,
  SPOOLGEN_MAX_FILE_BYTES,
  type SpoolgenFileRole,
} from "../domain/spoolgen-file";
import {
  computeFileChecksum,
  readSourceFile,
} from "../infrastructure/spoolgen-file-reader";
import {
  createSpoolingImportJob,
  loadJobIssues,
  recordSpoolingValidation,
  registerSpoolgenFile,
  revalidateSpoolingImportJob,
  spoolingObjectPath,
  uploadSpoolgenFile,
} from "../infrastructure/supabase-engineering-repository";
import { describeSpoolgenIssue } from "./spoolgen-issue-text";

export function SpoolingImportScreen({
  projectId,
  canManage,
  onValidated,
}: {
  projectId: string;
  canManage: boolean;
  onValidated: (jobId: string) => void;
}) {
  const tc = useTranslations("codes");
  const t = useTranslations("spooling");
  const fileInputs = useRef<
    Partial<Record<SpoolgenFileRole, HTMLInputElement | null>>
  >({});
  const [files, setFiles] = useState<Partial<Record<SpoolgenFileRole, File>>>(
    {},
  );
  const [issues, setIssues] = useState<StoredImportIssue[]>([]);
  const [busy, setBusy] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const presentRoles = useMemo(
    () => SPOOLGEN_FILE_ROLES.filter((role) => files[role] !== undefined),
    [files],
  );
  const fileSet = useMemo(() => describeFileSet(presentRoles), [presentRoles]);
  const pickFile = useCallback((role: SpoolgenFileRole, file: File | null) => {
    setIssues([]);
    setJobId(null);
    if (file === null) {
      setFiles((current) => {
        const next = { ...current };
        delete next[role];
        return next;
      });
      return;
    }
    const sizeIssue = checkFileSize(role, file.name, file.size);
    if (sizeIssue) {
      toast.error(describeSpoolgenIssue(t, sizeIssue));
      return;
    }
    setFiles((current) => ({ ...current, [role]: file }));
  }, [t]);
  const validate = useCallback(async () => {
    if (!canManage || busy) return;
    setBusy(true);
    try {
      const texts: Partial<Record<SpoolgenFileRole, string>> = {};
      for (const role of presentRoles)
        texts[role] = (await readSourceFile(files[role] as File)).text;
      const submission = buildSpoolgenSubmission(texts);
      if (!submission.canSubmit) {
        setIssues(submission.issues);
        toast.error(t("importScreen.requiredFile"));
        return;
      }
      const client = getSupabaseBrowserClient();
      const job = await createSpoolingImportJob(client, projectId, null);
      for (const role of presentRoles) {
        const file = files[role] as File;
        const path = spoolingObjectPath(projectId, job.id, role);
        await uploadSpoolgenFile(client, path, file);
        await registerSpoolgenFile(
          client,
          job.id,
          role,
          file,
          await computeFileChecksum(file),
          path,
        );
      }
      await recordSpoolingValidation(
        client,
        job.id,
        submission.rows,
        submission.issues,
      );
      const counts = await revalidateSpoolingImportJob(client, job.id);
      setIssues(await loadJobIssues(client, job.id));
      setJobId(job.id);
      onValidated(job.id);
      toast.success(
        t("importScreen.validated", { rows: submission.rows.length, errors: counts.blockerCount, warnings: counts.warningCount }),
      );
    } catch (error) {
      toast.error(t("importScreen.failed"), { description: errorDetail(error) });
    } finally {
      setBusy(false);
    }
  }, [busy, canManage, files, onValidated, presentRoles, projectId, t]);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          {t("importScreen.title")}
          <Badge variant="outline">
            {t("importScreen.files", {
              count: fileSet.complete ? SPOOLGEN_FILE_ROLES.length : presentRoles.length,
              total: SPOOLGEN_FILE_ROLES.length,
            })}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {t("importScreen.hint", { limit: SPOOLGEN_MAX_FILE_BYTES / (1024 * 1024) })}
        </p>
        <div className="space-y-2">
          {SPOOLGEN_FILE_ROLES.map((role) => (
            <div key={role} className="flex items-center gap-3 text-sm">
              <span className="w-72 shrink-0">
                {tc(`spoolgenRole.${role}`)}
              </span>
              <input
                ref={(element) => {
                  fileInputs.current[role] = element;
                }}
                className="sr-only"
                type="file"
                accept=".txt,.csv,.tsv,text/plain"
                disabled={busy || !canManage}
                onChange={(event) =>
                  pickFile(role, event.target.files?.[0] ?? null)
                }
              />
              <Button
                type="button"
                loading={busy} disabled={!canManage}
                onClick={() => fileInputs.current[role]?.click()}
              >
                {files[role]
                  ? t("importScreen.replace", { file: `${role}.txt` })
                  : tc(`spoolgenUpload.${role}`)}
              </Button>
              {files[role] ? (
                <span className="text-xs text-muted-foreground">
                  {files[role]?.name}
                </span>
              ) : null}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={validate}
            disabled={!canManage || busy || presentRoles.length === 0}
          >
            {t("importScreen.validate")}
          </Button>
          {jobId ? (
            <span className="text-sm text-muted-foreground">
              {t("importScreen.jobCreated")}
            </span>
          ) : null}
        </div>
        <ImportIssueList
          issues={issues.map((issue) => ({ ...issue, message: describeSpoolgenIssue(t, issue) }))}
        />
      </CardContent>
    </Card>
  );
}
