"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ImportIssue } from "@/modules/imports/domain/import-issue";
import { ImportIssueList } from "@/modules/imports/ui/import-issue-list";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { buildSpoolgenSubmission } from "../application/import-spooling";
import {
  checkFileSize,
  describeFileSet,
  SPOOLGEN_FILE_ROLES,
  type SpoolgenFileRole,
} from "../domain/spoolgen-file";
import {
  computeFileChecksum,
  readTextFile,
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

export const SPOOLGEN_ROLE_LABELS: Record<SpoolgenFileRole, string> = {
  weld: "weld.txt — ISO / spool / weld structure",
  trace: "trace.txt — ident codes and material trace",
  bolt: "bolt.txt — flange and bolting joints",
  supp: "supp.txt — supports",
};
export const UPLOAD_BUTTON_LABELS: Record<SpoolgenFileRole, string> = {
  weld: "Upload weld.txt",
  trace: "Upload trace.txt",
  bolt: "Upload bolt.txt",
  supp: "Upload supp.txt",
};

export function SpoolingImportScreen({
  projectId,
  canManage,
  onValidated,
}: {
  projectId: string;
  canManage: boolean;
  onValidated: (jobId: string) => void;
}) {
  const fileInputs = useRef<
    Partial<Record<SpoolgenFileRole, HTMLInputElement | null>>
  >({});
  const [files, setFiles] = useState<Partial<Record<SpoolgenFileRole, File>>>(
    {},
  );
  const [issues, setIssues] = useState<ImportIssue[]>([]);
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
      toast.error(sizeIssue.message);
      return;
    }
    setFiles((current) => ({ ...current, [role]: file }));
  }, []);
  const validate = useCallback(async () => {
    if (!canManage || busy) return;
    setBusy(true);
    try {
      const texts: Partial<Record<SpoolgenFileRole, string>> = {};
      for (const role of presentRoles)
        texts[role] = await readTextFile(files[role] as File);
      const submission = buildSpoolgenSubmission(texts);
      if (!submission.canSubmit) {
        setIssues(submission.issues);
        toast.error(
          "weld.txt is required before a SpoolGen import can be validated.",
        );
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
        `Validated ${submission.rows.length} rows: ${counts.blockerCount} errors, ${counts.warningCount} warnings.`,
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "The import could not be validated.",
      );
    } finally {
      setBusy(false);
    }
  }, [busy, canManage, files, onValidated, presentRoles, projectId]);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          SpoolGen import
          <Badge variant="outline">
            {fileSet.complete
              ? "4 of 4 files"
              : `${presentRoles.length} of 4 files`}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Upload the SpoolGen export. Only weld.txt is required; each file is
          limited to 4 MB.
        </p>
        <div className="space-y-2">
          {SPOOLGEN_FILE_ROLES.map((role) => (
            <div key={role} className="flex items-center gap-3 text-sm">
              <span className="w-72 shrink-0">
                {SPOOLGEN_ROLE_LABELS[role]}
              </span>
              <input
                ref={(element) => {
                  fileInputs.current[role] = element;
                }}
                className="sr-only"
                type="file"
                accept=".txt,.csv,.tsv,text/plain"
                disabled={!canManage || busy}
                onChange={(event) =>
                  pickFile(role, event.target.files?.[0] ?? null)
                }
              />
              <Button
                type="button"
                disabled={!canManage || busy}
                onClick={() => fileInputs.current[role]?.click()}
              >
                {files[role]
                  ? `Replace ${role}.txt`
                  : UPLOAD_BUTTON_LABELS[role]}
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
            {busy ? "Validating…" : "Validate files"}
          </Button>
          {jobId ? (
            <span className="text-sm text-muted-foreground">
              Job created. Review the decisions below before applying.
            </span>
          ) : null}
        </div>
        <ImportIssueList issues={issues} />
      </CardContent>
    </Card>
  );
}
