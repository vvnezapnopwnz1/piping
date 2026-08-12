"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSupabaseAuth } from "@/contexts/supabase-auth-context";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import {
  loadWeldingProcedures,
  createWeldingProcedure,
  updateWeldingProcedure,
  setWeldingProcedureStatus,
  LoadedWeldingProcedures
} from "@/lib/supabase/welding-procedures";
import {
  getWeldingProcedureStatusActions,
  toWeldingProcedureErrorMessage,
  type WeldingProcedure,
  type WeldingProcedureInput,
  type WpsStatus,
  validateWeldingProcedure,
} from "@/lib/welding-procedures";
import { createRequestVersion } from "@/lib/request-version";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Plus, Edit2, Archive, Play, Pause, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

const EMPTY_WPS_FORM: WeldingProcedureInput = {
  code: "",
  description: "",
  process: "",
  materialTypeId: "",
  subcontractorId: "",
  diameterFrom: "",
  diameterTo: "",
  thicknessFrom: "",
  thicknessTo: "",
  revision: "",
  approvedOn: "",
};

export function SupabaseWpsTab() {
  const { access } = useSupabaseAuth();
  const [data, setData] = useState<LoadedWeldingProcedures | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingWps, setEditingWps] = useState<WeldingProcedure | null>(null);
  const [formData, setFormData] = useState<WeldingProcedureInput>(EMPTY_WPS_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState<{ open: boolean; wps: WeldingProcedure | null }>({
    open: false,
    wps: null
  });

  const activeProjectId = access?.projectId;
  const requestVersion = useRef(createRequestVersion());

  const loadData = useCallback(async (projectId: string) => {
    const request = requestVersion.current.start();
    setLoading(true);
    setError(null);
    try {
      const res = await loadWeldingProcedures(getSupabaseBrowserClient(), projectId);
      if (request.isCurrent()) {
        setData(res);
      }
    } catch (loadError) {
      if (request.isCurrent()) setError(loadError instanceof Error ? loadError : new Error("Unable to load WPS data"));
    } finally {
      if (request.isCurrent()) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!activeProjectId) {
      requestVersion.current.invalidate();
      setData(null);
      setLoading(false);
      return;
    }

    void loadData(activeProjectId);

    return () => {
      requestVersion.current.invalidate();
    };
  }, [activeProjectId, loadData]);

  if (!activeProjectId) return null;

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-slate-500">
        <AlertCircle className="mb-4 h-8 w-8 text-red-500" />
        <p className="mb-4">Failed to load WPS data.</p>
        <Button onClick={() => loadData(activeProjectId)}>Retry</Button>
      </div>
    );
  }

  if (!data) return null;

  const handleOpenCreate = () => {
    setEditingWps(null);
    setFormData(EMPTY_WPS_FORM);
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleOpenEdit = (wps: WeldingProcedure) => {
    setEditingWps(wps);
    setFormData({
      code: wps.code,
      description: wps.description ?? "",
      process: wps.process,
      materialTypeId: wps.materialTypeId,
      subcontractorId: wps.subcontractorId,
      diameterFrom: String(wps.diameterFrom),
      diameterTo: String(wps.diameterTo),
      thicknessFrom: String(wps.thicknessFrom),
      thicknessTo: String(wps.thicknessTo),
      revision: wps.revision,
      approvedOn: wps.approvedOn
    });
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    const validation = validateWeldingProcedure(formData);
    if (!validation.isValid) {
      setFormErrors(validation.errors);
      return;
    }

    setSubmitting(true);
    try {
      const supabase = getSupabaseBrowserClient();
      if (editingWps) {
        const updated = await updateWeldingProcedure(supabase, activeProjectId, editingWps.id, validation.value);
        setData({ ...data, procedures: data.procedures.map(p => p.id === updated.id ? updated : p) });
        toast.success("WPS updated successfully");
      } else {
        const created = await createWeldingProcedure(supabase, activeProjectId, validation.value);
        setData({ ...data, procedures: [...data.procedures, created] });
        toast.success("WPS created successfully");
      }
      setDialogOpen(false);
    } catch {
      toast.error(toWeldingProcedureErrorMessage());
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (wpsId: string, status: WpsStatus) => {
    try {
      const supabase = getSupabaseBrowserClient();
      const updated = await setWeldingProcedureStatus(supabase, activeProjectId, wpsId, status);
      setData({ ...data, procedures: data.procedures.map(p => p.id === updated.id ? updated : p) });
      toast.success("WPS status updated");
    } catch {
      toast.error(toWeldingProcedureErrorMessage());
    }
  };

  const missingPrerequisites = data.materialTypes.length === 0 || data.subcontractors.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Welding Procedures</h3>
          <p className="text-sm text-slate-500">Manage project-specific welding procedures.</p>
        </div>
        <Button
          onClick={handleOpenCreate}
          disabled={!data.canEdit || missingPrerequisites}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add WPS
        </Button>
      </div>

      {!data.canEdit && (
        <div className="rounded-md bg-amber-50 p-4 border border-amber-200">
          <p className="text-sm text-amber-800">
            You do not have permission to administer this project. Form actions are disabled.
          </p>
        </div>
      )}

      {missingPrerequisites && (
        <div className="rounded-md bg-amber-50 p-4 border border-amber-200">
          <p className="text-sm text-amber-800">
            Cannot create WPS. Ensure active Material Types and Subcontractors exist in this project.
          </p>
        </div>
      )}

      {data.procedures.length === 0 ? (
        <Card className="border-slate-200 bg-slate-50 border-dashed">
          <CardContent className="flex flex-col items-center justify-center p-12 text-slate-500">
            <p>No welding procedures found for this project.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200">
                <th className="px-4 py-3 text-left font-medium text-slate-600">Code</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Process</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Material / Subcontractor</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Ranges</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Revision / Date</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
                <th className="px-4 py-3 text-right font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.procedures.map((wps) => (
                <tr key={wps.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium">{wps.code}</div>
                    {wps.description && <div className="text-xs text-slate-500">{wps.description}</div>}
                  </td>
                  <td className="px-4 py-3">{wps.process}</td>
                  <td className="px-4 py-3">
                    <div className="text-xs font-medium">
                      {data.materialTypes.find(m => m.id === wps.materialTypeId)?.code || wps.materialTypeId}
                    </div>
                    <div className="text-xs text-slate-500">
                      {data.subcontractors.find(s => s.id === wps.subcontractorId)?.code || wps.subcontractorId}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <div>D: {wps.diameterFrom} - {wps.diameterTo}</div>
                    <div>T: {wps.thicknessFrom} - {wps.thicknessTo}</div>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <div>{wps.revision}</div>
                    <div className="text-slate-500">{wps.approvedOn}</div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={wps.status === 'active' ? 'default' : wps.status === 'inactive' ? 'secondary' : 'outline'}>
                      {wps.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      {data.canEdit && (
                        <>
                          <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(wps)}>
                            <Edit2 className="h-4 w-4 text-slate-500" />
                          </Button>
                          {getWeldingProcedureStatusActions(wps.status).includes('deactivate') && (
                            <Button variant="ghost" size="icon" onClick={() => handleStatusChange(wps.id, 'inactive')} title="Deactivate">
                              <Pause className="h-4 w-4 text-slate-500" />
                            </Button>
                          )}
                          {getWeldingProcedureStatusActions(wps.status).includes('reactivate') && (
                            <Button variant="ghost" size="icon" onClick={() => handleStatusChange(wps.id, 'active')} title="Reactivate">
                              <Play className="h-4 w-4 text-slate-500" />
                            </Button>
                          )}
                          {getWeldingProcedureStatusActions(wps.status).includes('archive') && (
                            <Button variant="ghost" size="icon" onClick={() => setArchiveConfirmOpen({ open: true, wps })} title="Archive">
                              <Archive className="h-4 w-4 text-slate-500" />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingWps ? "Edit WPS" : "Add WPS"}</DialogTitle>
            <DialogDescription>
              Enter the details for the welding procedure.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Code *</Label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({...formData, code: e.target.value})}
                />
                {formErrors.code && <p className="text-xs text-red-500">{formErrors.code}</p>}
              </div>
              <div className="space-y-2">
                <Label>Process *</Label>
                <Input
                  value={formData.process}
                  onChange={(e) => setFormData({...formData, process: e.target.value})}
                />
                {formErrors.process && <p className="text-xs text-red-500">{formErrors.process}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Material Type *</Label>
                <Select value={formData.materialTypeId} onValueChange={(val) => setFormData({...formData, materialTypeId: val})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Material Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.materialTypes.map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.code}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.materialTypeId && <p className="text-xs text-red-500">{formErrors.materialTypeId}</p>}
              </div>
              <div className="space-y-2">
                <Label>Subcontractor *</Label>
                <Select value={formData.subcontractorId} onValueChange={(val) => setFormData({...formData, subcontractorId: val})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Subcontractor" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.subcontractors.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.code} — {s.description}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.subcontractorId && <p className="text-xs text-red-500">{formErrors.subcontractorId}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Diameter From *</Label>
                <Input type="number" value={formData.diameterFrom} onChange={(e) => setFormData({...formData, diameterFrom: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Diameter To *</Label>
                <Input type="number" value={formData.diameterTo} onChange={(e) => setFormData({...formData, diameterTo: e.target.value})} />
              </div>
            </div>
            {formErrors.diameter && <p className="text-xs text-red-500 mt-0">{formErrors.diameter}</p>}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Thickness From *</Label>
                <Input type="number" value={formData.thicknessFrom} onChange={(e) => setFormData({...formData, thicknessFrom: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Thickness To *</Label>
                <Input type="number" value={formData.thicknessTo} onChange={(e) => setFormData({...formData, thicknessTo: e.target.value})} />
              </div>
            </div>
            {formErrors.thickness && <p className="text-xs text-red-500 mt-0">{formErrors.thickness}</p>}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Revision *</Label>
                <Input value={formData.revision} onChange={(e) => setFormData({...formData, revision: e.target.value})} />
                {formErrors.revision && <p className="text-xs text-red-500">{formErrors.revision}</p>}
              </div>
              <div className="space-y-2">
                <Label>Approval Date *</Label>
                <Input type="date" value={formData.approvedOn} onChange={(e) => setFormData({...formData, approvedOn: e.target.value})} />
                {formErrors.approvedOn && <p className="text-xs text-red-500">{formErrors.approvedOn}</p>}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={archiveConfirmOpen.open} onOpenChange={(open) => !open && setArchiveConfirmOpen({ open: false, wps: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive WPS</DialogTitle>
            <DialogDescription>
              Are you sure you want to archive this WPS? It will remain visible but inactive.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArchiveConfirmOpen({ open: false, wps: null })}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (archiveConfirmOpen.wps) {
                  handleStatusChange(archiveConfirmOpen.wps.id, 'archived');
                  setArchiveConfirmOpen({ open: false, wps: null });
                }
              }}
            >
              Archive
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
