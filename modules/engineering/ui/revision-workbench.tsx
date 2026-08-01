"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import {
  describeRevisionApplyGate,
  groupByIsometric,
  unresolvedItems,
} from "../application/resolve-revision";
import { summarizeChanges, type PreviewChangeItem } from "../domain/diff";
import type { RevisionDecision } from "../domain/revision";
import {
  applySpoolingImportJob,
  loadPreview,
  recordRevisionDecision,
  revalidateSpoolingImportJob,
} from "../infrastructure/supabase-engineering-repository";
import { RevisionDecisionTable } from "./revision-decision-table";
export function RevisionWorkbench({
  jobId,
  canManage,
  onApplied,
}: {
  jobId: string | null;
  canManage: boolean;
  onApplied: () => void;
}) {
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
      toast.error(
        e instanceof Error ? e.message : "The preview could not be loaded.",
      );
    }
  }, [jobId]);
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
        toast.error(
          e instanceof Error ? e.message : "The decision could not be saved.",
        );
      } finally {
        setBusy(false);
      }
    },
    [canManage, jobId, refresh],
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
      toast.success(`Applied ${job.appliedRowCount} definition rows.`);
      onApplied();
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "The import could not be applied.",
      );
    } finally {
      setBusy(false);
    }
  }, [gate.allowed, jobId, onApplied]);
  const summary = useMemo(() => summarizeChanges(items), [items]);
  if (!jobId)
    return (
      <Card>
        <CardHeader>
          <CardTitle>Revision decisions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Validate a SpoolGen file set to see what it changes.
          </p>
        </CardContent>
      </Card>
    );
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          Revision decisions<Badge variant="outline">{summary.new} new</Badge>
          <Badge variant="outline">{summary.revised} revised</Badge>
          <Badge variant="outline">{summary.unchanged} unchanged</Badge>
          <Badge variant="outline">{summary.removed} removed</Badge>
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
            {busy ? "Applying…" : "Apply import"}
          </Button>
          {gate.reason ? (
            <span className="text-sm text-muted-foreground">{gate.reason}</span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
