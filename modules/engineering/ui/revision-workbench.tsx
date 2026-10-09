"use client";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { errorDetail } from "@/i18n/format";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { materializeProgressCopies } from "@/modules/construction/infrastructure/supabase-construction-repository";
import {
  describeRevisionApplyGate,
  groupByIsometric,
  unresolvedItems,
} from "../application/resolve-revision";
import { CHANGE_TYPES, summarizeChanges, type PreviewChangeItem } from "../domain/diff";
import type { RevisionDecision } from "../domain/revision";
import {
  applySpoolingImportJob,
  loadPreview,
  recordRevisionDecision,
  revalidateSpoolingImportJob,
} from "../infrastructure/supabase-engineering-repository";
import { RevisionDecisionTable } from "./revision-decision-table";
import { describeRevisionReason } from "./revision-reason-text";
export function RevisionWorkbench({
  jobId,
  canManage,
  onApplied,
}: {
  jobId: string | null;
  canManage: boolean;
  onApplied: () => void;
}) {
  const t = useTranslations("spooling");
  const [items, setItems] = useState<PreviewChangeItem[]>([]);
  const [blockers, setBlockers] = useState(0);
  const [status, setStatus] = useState("validated");
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    if (!jobId) {
      setItems([]);
      return;
    }
    try {
      const client = getSupabaseBrowserClient();
      const [preview, counts] = await Promise.all([
        loadPreview(client, jobId),
        revalidateSpoolingImportJob(client, jobId),
      ]);
      setItems(preview);
      setBlockers(counts.blockerCount);
    } catch (e) {
      toast.error(t("revision.previewFailed"), { description: errorDetail(e) });
    }
  }, [jobId, t]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  const unresolved = useMemo(() => unresolvedItems(items), [items]);
  const gate = useMemo(
    () =>
      describeRevisionApplyGate({
        status,
        alreadyApplied: status === "applied",
        blockerCount: blockers,
        unresolvedCount: unresolved.length,
      }),
    [blockers, status, unresolved.length],
  );
  const decide = useCallback(
    async (item: PreviewChangeItem, decision: RevisionDecision) => {
      if (!jobId || !canManage) return;
      setBusy(true);
      try {
        await recordRevisionDecision(
          getSupabaseBrowserClient(),
          jobId,
          item,
          decision,
          null,
        );
        await refresh();
      } catch (e) {
        toast.error(t("revision.decisionFailed"), { description: errorDetail(e) });
      } finally {
        setBusy(false);
      }
    },
    [canManage, jobId, refresh, t],
  );
  const apply = useCallback(async () => {
    if (!jobId || !gate.allowed) return;
    setBusy(true);
    try {
      const job = await applySpoolingImportJob(
        getSupabaseBrowserClient(),
        jobId,
      );
      setStatus(job.status);
      toast.success(t("revision.applied", { count: job.appliedRowCount }));
      // Plan section 3.4: the apply authorizes a carry-over, it does not perform it. The
      // command is idempotent, so a retry is harmless. An operator who may import but may
      // not record fabrication progress still gets a successful apply.
      try {
        let copied = 0;
        for (const revisionId of job.affectedEntityIds) {
          copied += await materializeProgressCopies(
            getSupabaseBrowserClient(),
            revisionId,
          );
        }
        if (copied > 0) toast.success(t("revision.carried", { count: copied }));
      } catch (carryError) {
        toast.warning(t("revision.carryOverFailed"), { description: errorDetail(carryError) });
      }
      onApplied();
    } catch (e) {
      toast.error(t("revision.applyFailed"), { description: errorDetail(e) });
    } finally {
      setBusy(false);
    }
  }, [gate.allowed, jobId, onApplied, t]);
  const summary = useMemo(() => summarizeChanges(items), [items]);
  if (!jobId)
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("revision.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t("revision.empty")}
          </p>
        </CardContent>
      </Card>
    );
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          {t("revision.title")}
          {CHANGE_TYPES.map((change) => (
            <Badge key={change} variant="outline">{t(`revision.summary.${change}`, { count: summary[change] })}</Badge>
          ))}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {Array.from(groupByIsometric(items)).map(([iso, group]) => (
          <section key={iso} className="space-y-2">
            <h3 className="font-mono text-sm font-semibold">{iso}</h3>
            <RevisionDecisionTable
              items={group}
              canManage={canManage}
              busy={busy}
              onDecide={decide}
            />
          </section>
        ))}
        <div className="flex items-center gap-3">
          <Button
            onClick={apply}
            disabled={!canManage || busy || !gate.allowed}
          >
            {t("revision.apply")}
          </Button>
          {gate.reason ? (
            <span className="text-sm text-muted-foreground">{describeRevisionReason(t, gate.reason)}</span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
