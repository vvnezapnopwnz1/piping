"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { useAllTeams, useFlangeStore, useTestpackStore, useTeams } from "@/store";
import { Button } from "@/components/ui/button";
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

export function ProgressView() {
  const searchParams = useSearchParams();
  const requestFilter = searchParams.get("request") ?? "all";

  const testPacks = useTestpackStore((s) => s.testPacks);
  const requests = useFlangeStore((s) => s.reinstatementRequests);
  const joints = useFlangeStore((s) => s.joints);
  const markReinstated = useTestpackStore((s) => s.markReinstated);

  const jointers = useTeams("jointer");
  const allReinstatementTeams = useAllTeams("reinstatement");

  const [requestId, setRequestId] = useState(requestFilter);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [jointer, setJointer] = useState("");
  const [reportNo, setReportNo] = useState("");
  const [tagNo, setTagNo] = useState("");

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return joints
      .filter((joint) => !!joint.reinstatementRequestId && !joint.reinstatedAt)
      .filter((joint) => requestId === "all" || joint.reinstatementRequestId === requestId)
      .filter((joint) => {
        if (!q) return true;
        const tp = testPacks.find((t) => t.id === (joint.testpackId ?? joint.testPackId));
        return (
          joint.id.toLowerCase().includes(q) ||
          joint.btNo.toLowerCase().includes(q) ||
          joint.isoNo.toLowerCase().includes(q) ||
          (tp?.no ?? "").toLowerCase().includes(q)
        );
      })
      .map((joint) => {
        const req = requests.find((r) => r.id === joint.reinstatementRequestId);
        const tpId = joint.testpackId ?? joint.testPackId;
        const tp = testPacks.find((t) => t.id === tpId);
        return {
          id: joint.id,
          btNo: joint.btNo,
          isoNo: joint.isoNo,
          category: joint.category ?? joint.jointCategory,
          requestId: joint.reinstatementRequestId ?? "",
          team: req?.assignedTo ?? "",
          teamLabel: allReinstatementTeams.find((t) => t.code === req?.assignedTo)?.name ?? req?.assignedTo ?? "",
          testpackNo: tp?.no ?? tpId,
        };
      });
  }, [joints, requests, testPacks, requestId, search, allReinstatementTeams]);

  const save = () => {
    if (!selectedId || !date || !jointer || !reportNo || !tagNo) return;
    const row = rows.find((r) => r.id === selectedId);
    markReinstated(selectedId, {
      date,
      jointerNo: jointer,
      reportNo,
      tagNo,
      reinstatedBy: row?.team || "RT-01",
    });
    toast.success(`Flange joint ${selectedId} marked reinstated`);
    setSelectedId(null);
    setReportNo("");
    setTagNo("");
  };

  const selected = rows.find((r) => r.id === selectedId) ?? null;

  return (
    <div className="space-y-4">
      <Link
        href="/testpack/pressure-test"
        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-sky-600"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Pressure Test
      </Link>

      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="text-sm font-semibold">Flange reinstatement progress</div>
        <div className="text-xs text-slate-600">Category Y — after test · Category Z — after pre-commissioning</div>

        <div className="flex gap-2">
          <Select value={requestId} onValueChange={setRequestId}>
            <SelectTrigger className="h-8 w-[220px] text-xs"><SelectValue placeholder="Request" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All requests</SelectItem>
              {requests.map((r) => (
                <SelectItem key={r.id} value={r.id}>{r.id}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search flange / ISO / testpack" className="h-8 text-xs" />
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Flange joint</TableHead>
                <TableHead>ISO</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Testpack</TableHead>
                <TableHead>Assigned team</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-xs text-slate-500 py-8">No assigned flange joints</TableCell></TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id} className={selectedId === row.id ? "bg-sky-50" : ""} onClick={() => setSelectedId(row.id)}>
                    <TableCell className="font-mono text-xs">{row.btNo}</TableCell>
                    <TableCell className="text-xs">{row.isoNo}</TableCell>
                    <TableCell className="text-xs">{row.category}</TableCell>
                    <TableCell className="text-xs">{row.testpackNo}</TableCell>
                    <TableCell className="text-xs">{row.team} · {row.teamLabel}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="rounded-lg border border-slate-200 p-3 space-y-2">
          <div className="text-xs font-semibold">Record reinstatement</div>
          <div className="text-xs text-slate-600">Selected joint: {selected?.btNo ?? "—"}</div>
          <div className="grid grid-cols-2 gap-2">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-8 text-xs" />
            <Select value={jointer} onValueChange={setJointer}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Jointer" /></SelectTrigger>
              <SelectContent>
                {jointers.map((j) => (
                  <SelectItem key={j.code} value={j.code}>{j.code}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input value={reportNo} onChange={(e) => setReportNo(e.target.value)} placeholder="Report number" className="h-8 text-xs" />
            <Input value={tagNo} onChange={(e) => setTagNo(e.target.value)} placeholder="Tag number" className="h-8 text-xs" />
          </div>
          <Button className="h-8" onClick={save} disabled={!selectedId || !jointer || !reportNo || !tagNo}>Save reinstatement</Button>
        </div>
      </div>
    </div>
  );
}
