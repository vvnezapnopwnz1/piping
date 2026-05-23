"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Check, FileText } from "lucide-react";
import { toast } from "sonner";

import { useFlangeStore, useTeams, useTestpackStore } from "@/store";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  TestpackWorkflowGuards,
  useTestpackWorkflowLocks,
} from "@/components/testpack/testpack-workflow-guards";

export function PreparationView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const testpackParam = searchParams.get("testpack") ?? "all";

  const testPacks = useTestpackStore((s) => s.testPacks);
  const joints = useFlangeStore((s) => s.joints);
  const assignReinstatement = useTestpackStore((s) => s.assignReinstatement);
  const reinstatementRequests = useTestpackStore((s) => s.reinstatementRequests);
  const { pmLocked } = useTestpackWorkflowLocks();
  const teams = useTeams("reinstatement");

  const [search, setSearch] = useState("");
  const [testpackId, setTestpackId] = useState(testpackParam);
  const [team, setTeam] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const eligible = useMemo(() => {
    const rows = joints.filter((joint) => {
      const tpId = joint.testpackId ?? joint.testPackId;
      const category = joint.category ?? joint.jointCategory;
      const tp = testPacks.find((t) => t.id === tpId);
      if (!tp || !tpId) return false;
      if (joint.reinstatedAt || joint.reinstatementRequestId) return false;
      const phaseOk = (category === "Y" && !!tp.testingDoneDate) || (category === "Z" && !!tp.preCommDate);
      if (!phaseOk) return false;
      if (testpackId !== "all" && tpId !== testpackId) return false;
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        joint.id.toLowerCase().includes(q) ||
        joint.btNo.toLowerCase().includes(q) ||
        joint.isoNo.toLowerCase().includes(q) ||
        tp.no.toLowerCase().includes(q)
      );
    });

    return rows.map((joint) => {
      const tpId = joint.testpackId ?? joint.testPackId;
      const tp = testPacks.find((t) => t.id === tpId);
      return {
        id: joint.id,
        btNo: joint.btNo,
        isoNo: joint.isoNo,
        category: joint.category ?? joint.jointCategory,
        testpackId: tpId,
        testpackNo: tp?.no ?? tpId,
      };
    });
  }, [joints, testPacks, testpackId, search]);

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === eligible.length) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(eligible.map((r) => r.id)));
  };

  const handleAssign = () => {
    if (!team || selectedIds.size === 0) return;
    const { requestId } = assignReinstatement(Array.from(selectedIds), team);
    setSelectedIds(new Set());
    setTeam("");
    toast.success(`Flange reinstatement request ${requestId} created`);
    router.push(`/testpack/pressure-test/reinstatement/progress?request=${requestId}`);
  };

  return (
    <div className="space-y-4">
      <Link
        href="/testpack/pressure-test"
        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-sky-600"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Pressure Test
      </Link>
      <TestpackWorkflowGuards />

      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="text-sm font-semibold">Flange reinstatement</div>
        <div className="text-xs text-slate-600">
          Category Y — after test · Category Z — after pre-commissioning · Punch category X remains in Item Clearance.
        </div>
        <div className="flex gap-2">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search flange / ISO / testpack" className="h-8 text-xs" />
          <Select value={testpackId} onValueChange={setTestpackId}>
            <SelectTrigger className="h-8 w-[180px] text-xs"><SelectValue placeholder="Testpack" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All testpacks</SelectItem>
              {testPacks.map((tp) => (
                <SelectItem key={tp.id} value={tp.id}>{tp.no}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"><Checkbox checked={eligible.length > 0 && selectedIds.size === eligible.length} onCheckedChange={toggleAll} /></TableHead>
                <TableHead>Flange joint</TableHead>
                <TableHead>ISO</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Testpack</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {eligible.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-xs text-slate-500 py-8">No eligible flange joints</TableCell></TableRow>
              ) : (
                eligible.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell><Checkbox checked={selectedIds.has(row.id)} onCheckedChange={() => toggle(row.id)} /></TableCell>
                    <TableCell className="font-mono text-xs">{row.btNo}</TableCell>
                    <TableCell className="text-xs">{row.isoNo}</TableCell>
                    <TableCell className="text-xs">{row.category}</TableCell>
                    <TableCell className="text-xs">{row.testpackNo}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex gap-2">
          <Select value={team} onValueChange={setTeam}>
            <SelectTrigger className="h-8 w-[260px] text-xs"><SelectValue placeholder="Assign reinstatement team" /></SelectTrigger>
            <SelectContent>
              {teams.map((t) => (
                <SelectItem key={t.code} value={t.code}>{t.code} · {t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            className="h-8"
            onClick={handleAssign}
            disabled={!team || selectedIds.size === 0 || pmLocked}
          >
            Assign
          </Button>
        </div>
      </div>

      {reinstatementRequests.length > 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-600">
            Recent reinstatement requests
          </p>
          <ul className="space-y-2">
            {reinstatementRequests.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between text-sm"
              >
                <span className="font-mono text-sky-700">{r.id}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    window.open(
                      `/testpack/print/reinstatement/${r.id}`,
                      "_blank",
                    )
                  }
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Generate Request PDF
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
