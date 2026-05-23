"use client";

import { Fragment, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronDown, ChevronRight, Search } from "lucide-react";

import { FlangeDetailPanel } from "@/components/flange/flange-detail-panel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
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
import { cn } from "@/lib/utils";
import {
  flangeFilterOptions,
  groupFlangesByIso,
  type BoltingStatus,
} from "@/lib/flange-data";
import { useFlangeStore } from "@/store";

function boltingBadge(status: BoltingStatus) {
  switch (status) {
    case "Torque Verified":
      return "border-emerald-300 bg-emerald-100 text-emerald-800";
    case "Bolted":
      return "border-sky-300 bg-sky-100 text-sky-800";
    case "Not Started":
      return "border-slate-300 bg-slate-100 text-slate-700";
    case "Reinstatement Required":
      return "border-amber-300 bg-amber-100 text-amber-800";
    case "Reinstated":
      return "border-emerald-300 bg-emerald-100 text-emerald-800";
  }
}

export function FlangeBrowse() {
  const searchParams = useSearchParams();
  const testpackFilter = searchParams.get("testpack");
  const joints = useFlangeStore((s) => s.joints);
  const updateJoint = useFlangeStore((s) => s.updateJoint);
  const [search, setSearch] = useState("");
  const [pdsArea, setPdsArea] = useState("All Areas");
  const [lineNo, setLineNo] = useState("All Lines");
  const [isoNo, setIsoNo] = useState("All ISOs");
  const [priority, setPriority] = useState<string>("All");
  const [type, setType] = useState("All Types");
  const [serviceClass, setServiceClass] = useState("All Classes");
  const [subcontractor, setSubcontractor] = useState("All Subcontractors");
  const [areaClassification, setAreaClassification] = useState("All Areas");
  const [boltingStatus, setBoltingStatus] = useState<string>("All Statuses");
  const [expandedIsos, setExpandedIsos] = useState<Set<string>>(
    () => new Set(["ISO-CW-001-A"]),
  );
  const [selectedId, setSelectedId] = useState<string | null>("FJ-001");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return joints.filter((j) => {
      if (
        testpackFilter &&
        j.testPackId !== testpackFilter &&
        j.testpackId !== testpackFilter
      )
        return false;
      if (pdsArea !== "All Areas" && j.pdsArea !== pdsArea) return false;
      if (lineNo !== "All Lines" && j.lineNo !== lineNo) return false;
      if (isoNo !== "All ISOs" && j.isoNo !== isoNo) return false;
      if (priority !== "All" && j.priority !== priority) return false;
      if (type !== "All Types" && j.type !== type) return false;
      if (serviceClass !== "All Classes" && j.serviceClass !== serviceClass) return false;
      if (subcontractor !== "All Subcontractors" && j.subcontractor !== subcontractor)
        return false;
      if (areaClassification !== "All Areas" && j.areaClassification !== areaClassification)
        return false;
      if (boltingStatus !== "All Statuses" && j.boltingStatus !== boltingStatus)
        return false;
      if (q) {
        return (
          j.btNo.toLowerCase().includes(q) ||
          j.isoNo.toLowerCase().includes(q) ||
          j.lineNo.toLowerCase().includes(q) ||
          (j.testpackId ?? j.testPackId).toLowerCase().includes(q) ||
          (j.jointer?.toLowerCase().includes(q) ?? false)
        );
      }
      return true;
    });
  }, [
    joints,
    search,
    testpackFilter,
    pdsArea,
    lineNo,
    isoNo,
    priority,
    type,
    serviceClass,
    subcontractor,
    areaClassification,
    boltingStatus,
  ]);

  const groups = useMemo(() => groupFlangesByIso(filtered), [filtered]);

  const kpis = useMemo(() => {
    const total = filtered.length;
    const bolted = filtered.filter((j) => j.boltingStatus !== "Not Started").length;
    const torqueVerified = filtered.filter(
      (j) => j.boltingStatus === "Torque Verified",
    ).length;
    return { total, bolted, torqueVerified, outstanding: total - bolted };
  }, [filtered]);

  const selectedJoint = joints.find((j) => j.id === selectedId) ?? null;

  const toggleIso = (iso: string) => {
    setExpandedIsos((prev) => {
      const next = new Set(prev);
      if (next.has(iso)) next.delete(iso);
      else next.add(iso);
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="min-w-0 flex-1 space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card className="py-3">
            <CardContent className="px-4 py-0">
              <p className="text-xs text-muted-foreground">Total joints</p>
              <p className="text-2xl font-bold text-slate-900">{kpis.total}</p>
            </CardContent>
          </Card>
          <Card className="py-3">
            <CardContent className="px-4 py-0">
              <p className="text-xs text-muted-foreground">Bolted</p>
              <p className="text-2xl font-bold text-sky-700">{kpis.bolted}</p>
            </CardContent>
          </Card>
          <Card className="py-3">
            <CardContent className="px-4 py-0">
              <p className="text-xs text-muted-foreground">Torque verified</p>
              <p className="text-2xl font-bold text-emerald-700">
                {kpis.torqueVerified}
              </p>
            </CardContent>
          </Card>
          <Card className="py-3">
            <CardContent className="px-4 py-0">
              <p className="text-xs text-muted-foreground">Outstanding</p>
              <p className="text-2xl font-bold text-amber-700">
                {kpis.outstanding}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="overflow-hidden border-slate-200">
          <CardHeader className="border-b py-3">
            <div className="flex flex-col gap-3">
              <CardTitle className="text-base font-semibold">
                Browse flange joints
              </CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[200px] flex-1">
                  <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search BT, ISO, line..."
                    className="h-8 pl-9 text-xs"
                  />
                </div>
                <Select value={pdsArea} onValueChange={setPdsArea}>
                  <SelectTrigger className="h-8 w-[110px] text-xs">
                    <SelectValue placeholder="PDS Area" />
                  </SelectTrigger>
                  <SelectContent>
                    {flangeFilterOptions.pdsAreas.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={lineNo} onValueChange={setLineNo}>
                  <SelectTrigger className="h-8 w-[110px] text-xs">
                    <SelectValue placeholder="Line" />
                  </SelectTrigger>
                  <SelectContent>
                    {flangeFilterOptions.lines.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={isoNo} onValueChange={setIsoNo}>
                  <SelectTrigger className="h-8 w-[130px] text-xs">
                    <SelectValue placeholder="ISO" />
                  </SelectTrigger>
                  <SelectContent>
                    {flangeFilterOptions.isos.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className="h-8 w-[90px] text-xs">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    {flangeFilterOptions.priorities.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={boltingStatus} onValueChange={setBoltingStatus}>
                  <SelectTrigger className="h-8 w-[120px] text-xs">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {flangeFilterOptions.boltingStatuses.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger className="h-8 w-[100px] text-xs">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {flangeFilterOptions.types.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={serviceClass} onValueChange={setServiceClass}>
                  <SelectTrigger className="h-8 w-[110px] text-xs">
                    <SelectValue placeholder="Service" />
                  </SelectTrigger>
                  <SelectContent>
                    {flangeFilterOptions.serviceClasses.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={subcontractor} onValueChange={setSubcontractor}>
                  <SelectTrigger className="h-8 w-[150px] text-xs">
                    <SelectValue placeholder="Subcontractor" />
                  </SelectTrigger>
                  <SelectContent>
                    {flangeFilterOptions.subcontractors.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={areaClassification}
                  onValueChange={setAreaClassification}
                >
                  <SelectTrigger className="h-8 w-[110px] text-xs">
                    <SelectValue placeholder="Area class" />
                  </SelectTrigger>
                  <SelectContent>
                    {flangeFilterOptions.areaClassifications.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Torque verification</span>
                  <span>
                    {kpis.total > 0
                      ? Math.round((kpis.torqueVerified / kpis.total) * 100)
                      : 0}
                    %
                  </span>
                </div>
                <Progress
                  value={
                    kpis.total > 0
                      ? (kpis.torqueVerified / kpis.total) * 100
                      : 0
                  }
                  className="h-1.5"
                />
              </div>
            </div>
          </CardHeader>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead className="text-xs font-semibold uppercase text-slate-500">
                    ISO / BT No
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-slate-500">
                    Diam / Rating
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-slate-500">
                    Period / Cat
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-slate-500">
                    Torque (N·m)
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-slate-500">
                    Jointer
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-slate-500">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="py-12 text-center text-sm text-muted-foreground"
                    >
                      No flange joints match the current filters
                    </TableCell>
                  </TableRow>
                ) : (
                  groups.map((group) => {
                    const expanded = expandedIsos.has(group.isoNo);
                    return (
                      <Fragment key={group.isoNo}>
                        <TableRow
                          className="cursor-pointer bg-slate-50/80 hover:bg-slate-100"
                          onClick={() => toggleIso(group.isoNo)}
                        >
                          <TableCell className="w-8 px-2">
                            {expanded ? (
                              <ChevronDown className="h-4 w-4 text-slate-500" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-slate-500" />
                            )}
                          </TableCell>
                          <TableCell colSpan={7} className="py-2.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-xs font-semibold text-sky-700">
                                {group.isoNo}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                Rev {group.rev} · {group.lineNo} · {group.pdsArea}
                              </span>
                              <Badge variant="outline" className="text-[10px]">
                                {group.joints.length} joints
                              </Badge>
                            </div>
                          </TableCell>
                        </TableRow>
                        {expanded &&
                          group.joints.map((joint) => (
                            <TableRow
                              key={joint.id}
                              onClick={() => setSelectedId(joint.id)}
                              className={cn(
                                "cursor-pointer hover:bg-sky-50/50",
                                selectedId === joint.id && "bg-sky-50",
                              )}
                            >
                              <TableCell />
                              <TableCell className="font-mono text-xs font-medium text-slate-900">
                                {joint.btNo}
                              </TableCell>
                              <TableCell className="text-xs text-slate-700">
                                {joint.diamInch}&quot; {joint.rating}
                              </TableCell>
                              <TableCell className="text-xs text-slate-700">
                                {joint.jointPeriod} · {joint.jointCategory}
                              </TableCell>
                              <TableCell className="text-xs font-semibold text-slate-900">
                                {joint.jointingValue}
                              </TableCell>
                              <TableCell className="text-xs text-slate-600">
                                {joint.jointer ?? "—"}
                              </TableCell>
                              <TableCell>
                                <span
                                  className={cn(
                                    "inline-flex rounded border px-2 py-0.5 text-[10px] font-medium",
                                    boltingBadge(joint.boltingStatus),
                                  )}
                                >
                                  {joint.boltingStatus}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                      </Fragment>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      <FlangeDetailPanel
        joint={selectedJoint}
        onClose={() => setSelectedId(null)}
        onSave={(updated) => {
          updateJoint(updated.id, updated);
        }}
      />
    </div>
  );
}
