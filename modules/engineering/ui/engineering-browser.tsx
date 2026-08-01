"use client";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import type { RevisionStatus } from "../domain/revision";
import {
  loadIsometrics,
  loadRevisionGraph,
  loadRevisionHistory,
  type IsometricSummary,
  type RevisionSummary,
  type SpoolNode,
} from "../infrastructure/supabase-engineering-repository";
const style: Record<RevisionStatus, string> = {
  draft: "bg-slate-100 text-slate-700",
  accepted: "bg-emerald-100 text-emerald-900",
  superseded: "bg-slate-200 text-slate-600",
};
export function EngineeringBrowser({
  projectId,
  refreshToken,
}: {
  projectId: string;
  refreshToken: number;
}) {
  const [isos, setIsos] = useState<IsometricSummary[]>([]);
  const [selectedIso, setSelectedIso] = useState<string | null>(null);
  const [revisions, setRevisions] = useState<RevisionSummary[]>([]);
  const [selectedRevision, setSelectedRevision] = useState<string | null>(null);
  const [spools, setSpools] = useState<SpoolNode[]>([]);
  const selectRevision = useCallback(async (id: string) => {
    setSelectedRevision(id);
    try {
      setSpools(await loadRevisionGraph(getSupabaseBrowserClient(), id));
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "The revision could not be loaded.",
      );
    }
  }, []);
  useEffect(() => {
    void loadIsometrics(getSupabaseBrowserClient(), projectId)
      .then(setIsos)
      .catch((e) =>
        toast.error(
          e instanceof Error ? e.message : "Isometrics could not be loaded.",
        ),
      );
  }, [projectId, refreshToken]);
  const selectIso = useCallback(
    async (iso: IsometricSummary) => {
      setSelectedIso(iso.id);
      setSelectedRevision(null);
      setSpools([]);
      try {
        const history = await loadRevisionHistory(
          getSupabaseBrowserClient(),
          iso.id,
        );
        setRevisions(history);
        const accepted = history.find((r) => r.status === "accepted");
        if (accepted) await selectRevision(accepted.id);
      } catch (e) {
        toast.error(
          e instanceof Error
            ? e.message
            : "Revision history could not be loaded.",
        );
      }
    },
    [selectRevision],
  );
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Isometrics</CardTitle>
        </CardHeader>
        <CardContent>
          {isos.map((iso) => (
            <button
              key={iso.id}
              type="button"
              onClick={() => void selectIso(iso)}
              className={`flex w-full justify-between rounded px-2 py-1 text-left ${selectedIso === iso.id ? "bg-muted" : ""}`}
            >
              <span className="font-mono text-xs">{iso.isoNumber}</span>
              <Badge variant="outline">
                {iso.acceptedRevisionNumber ?? "—"}
              </Badge>
            </button>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Revision history</CardTitle>
        </CardHeader>
        <CardContent>
          {revisions.map((revision) => (
            <button
              key={revision.id}
              type="button"
              onClick={() => void selectRevision(revision.id)}
              className={`flex w-full justify-between rounded px-2 py-1 ${selectedRevision === revision.id ? "bg-muted" : ""}`}
            >
              <span>{revision.revisionNumber}</span>
              <Badge variant="outline" className={style[revision.status]}>
                {revision.status}
              </Badge>
            </button>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Spools</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {spools.map((spool) => (
            <div key={spool.id} className="rounded border px-3 py-2 text-sm">
              <div className="flex justify-between">
                <span className="font-mono">{spool.spoolNumber}</span>
                {spool.isRemoved ? (
                  <Badge variant="outline">Removed</Badge>
                ) : null}
              </div>
              <p className="text-xs">
                Welds: {spool.weldNumbers.join(", ") || "—"}
              </p>
              <p className="text-xs">
                Supports: {spool.supportNumbers.join(", ") || "—"}
              </p>
              <p className="text-xs">
                Flange joints: {spool.flangeNumbers.join(", ") || "—"}
              </p>
              <p className="text-xs">
                Ident codes: {spool.identCodes.join(", ") || "—"}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
