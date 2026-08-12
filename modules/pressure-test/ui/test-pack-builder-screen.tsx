"use client"

import { useEffect, useMemo, useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import { composeManagedTestPack, createManagedTestPack, moveManagedTestPackIsometric, removeManagedTestPackIsometric, updateManagedTestPack, archiveManagedTestPack } from "../application/manage-test-pack"
import { listAvailableIsometricReadiness, listProjectIsometricNumbers, listProjectLineServices, listProjectServiceClasses, listProjectSubsystems, listProjectSystems, listTestPackCatalog, listTestPackMembers, type IsometricNumberRow, type IsometricReadinessRow, type ProjectReferenceOptionRow, type ProjectSubsystemOptionRow, type TestPackCatalogRow, type TestPackMemberRow } from "../infrastructure/supabase-pressure-test-repository"
import { isometricOptions, keepSelectedOption, subsystemOptionsForSystem, toReferenceOptions, type ReferenceOption } from "./test-pack-reference-model"

type FormState = { testPackNumber: string; location: string; priority: string; medium: string; pressure: string; volumeM3: string; plannedStartOn: string; plannedEndOn: string; systemId: string; subsystemId: string; serviceClassId: string; lineServiceId: string }
const emptyForm: FormState = { testPackNumber: "", location: "", priority: "Normal", medium: "P", pressure: "", volumeM3: "", plannedStartOn: "", plannedEndOn: "", systemId: "", subsystemId: "", serviceClassId: "", lineServiceId: "" }

/** Typed by the presenter. The four referential fields below are chosen, never typed. */
const TEXT_FIELDS = ["testPackNumber", "location", "priority", "plannedStartOn", "plannedEndOn", "pressure", "volumeM3"] as const
const REFERENCE_FIELDS = [
  { field: "systemId", label: "System" },
  { field: "subsystemId", label: "Subsystem" },
  { field: "serviceClassId", label: "Service class" },
  { field: "lineServiceId", label: "Line service" },
] as const

function toInput(form: FormState, isoIds: string[]) {
  return { ...form, pressure: Number(form.pressure), volumeM3: form.volumeM3 ? Number(form.volumeM3) : undefined, isoIds }
}

export function TestPackBuilderScreen({ projectId, canManage }: { projectId: string; canManage: boolean }) {
  const [packs, setPacks] = useState<TestPackCatalogRow[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [members, setMembers] = useState<TestPackMemberRow[]>([])
  const [available, setAvailable] = useState<IsometricReadinessRow[]>([])
  const [isoNumbers, setIsoNumbers] = useState<IsometricNumberRow[]>([])
  const [systems, setSystems] = useState<ProjectReferenceOptionRow[]>([])
  const [subsystems, setSubsystems] = useState<ProjectSubsystemOptionRow[]>([])
  const [serviceClasses, setServiceClasses] = useState<ProjectReferenceOptionRow[]>([])
  const [lineServices, setLineServices] = useState<ProjectReferenceOptionRow[]>([])
  const [selectedAvailable, setSelectedAvailable] = useState<string[]>([])
  const [form, setForm] = useState<FormState>(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const refresh = async (packId = selected) => {
    const client = getSupabaseBrowserClient()
    const [nextPacks, nextAvailable, nextIsoNumbers] = await Promise.all([listTestPackCatalog(client, projectId), listAvailableIsometricReadiness(client, projectId), listProjectIsometricNumbers(client, projectId)])
    setPacks(nextPacks)
    setAvailable(nextAvailable)
    setIsoNumbers(nextIsoNumbers)
    if (packId) {
      const nextMembers = await listTestPackMembers(client, projectId, packId)
      setMembers(nextMembers)
      const nextPack = nextPacks.find((pack) => pack.id === packId)
      if (nextPack) setForm({ testPackNumber: nextPack.testPackNumber, location: nextPack.location ?? "", priority: nextPack.priority ?? "Normal", medium: nextPack.medium ?? "P", pressure: String(nextPack.pressure ?? ""), volumeM3: nextPack.volumeM3 === undefined ? "" : String(nextPack.volumeM3), plannedStartOn: nextPack.plannedStartOn ?? "", plannedEndOn: nextPack.plannedEndOn ?? "", systemId: nextPack.systemId ?? "", subsystemId: nextPack.subsystemId ?? "", serviceClassId: nextPack.serviceClassId ?? "", lineServiceId: nextPack.lineServiceId ?? "" })
    }
  }

  const loadReferences = async () => {
    const client = getSupabaseBrowserClient()
    const [nextSystems, nextSubsystems, nextServiceClasses, nextLineServices] = await Promise.all([listProjectSystems(client, projectId), listProjectSubsystems(client, projectId), listProjectServiceClasses(client, projectId), listProjectLineServices(client, projectId)])
    setSystems(nextSystems); setSubsystems(nextSubsystems); setServiceClasses(nextServiceClasses); setLineServices(nextLineServices)
  }

  useEffect(() => { let active = true; setPacks([]); setAvailable([]); setIsoNumbers([]); setMembers([]); setSystems([]); setSubsystems([]); setServiceClasses([]); setLineServices([]); setSelected(null); setError(null); setLoading(true); void Promise.all([refresh(null), loadReferences()]).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Could not load Builder") }).finally(() => { if (active) setLoading(false) }); return () => { active = false } }, [projectId])
  useEffect(() => { if (!selected) { setMembers([]); setForm(emptyForm); return }; void refresh(selected).catch((cause) => setError(cause instanceof Error ? cause.message : "Could not load Test Pack")) }, [selected])

  const memberIds = useMemo(() => new Set(members.map((member) => member.isometric_id)), [members])
  const availableOptions = useMemo(() => isometricOptions(available, isoNumbers).filter((option) => !memberIds.has(option.id)), [available, isoNumbers, memberIds])
  const isoLabelById = useMemo(() => new Map(isoNumbers.map((row) => [row.id, row.isoNumber])), [isoNumbers])
  const systemOptions = useMemo(() => toReferenceOptions(systems), [systems])
  const subsystemOptions = useMemo(() => subsystemOptionsForSystem(subsystems, form.systemId), [subsystems, form.systemId])
  const serviceClassOptions = useMemo(() => toReferenceOptions(serviceClasses), [serviceClasses])
  const lineServiceOptions = useMemo(() => toReferenceOptions(lineServices), [lineServices])
  const optionsFor = (field: (typeof REFERENCE_FIELDS)[number]["field"]): ReferenceOption[] => field === "systemId" ? systemOptions : field === "subsystemId" ? subsystemOptions : field === "serviceClassId" ? serviceClassOptions : lineServiceOptions
  // A Subsystem belongs to one System, so switching System drops a selection the new one does not own.
  const updateField = (field: keyof FormState, value: string) => setForm((current) => field === "systemId" ? { ...current, systemId: value, subsystemId: keepSelectedOption(current.subsystemId, subsystemOptionsForSystem(subsystems, value)) } : { ...current, [field]: value })
  // Re-entry matters here beyond the usual: `selected` is set as soon as the create resolves, so a
  // second click lands on the update branch and bumps the server revision for no reason.
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (!canManage || submitting) return
    setError(null); setNotice(null); setSubmitting(true)
    try {
      if (selected) {
        const result = await updateManagedTestPack(getSupabaseBrowserClient(), selected, toInput(form, []))
        if (!result.ok) { setError(Object.values(result.errors).join("; ")); return }
        setNotice("Metadata saved; server revision incremented.")
      } else {
        const result = await createManagedTestPack(getSupabaseBrowserClient(), projectId, toInput(form, selectedAvailable), `browser-create-${Date.now()}`)
        if (!result.ok) { setError(Object.values(result.errors).join("; ")); return }
        const createdId = (result.value as { id?: string }).id
        if (createdId) for (const isoId of selectedAvailable) await composeManagedTestPack(getSupabaseBrowserClient(), createdId, isoId)
        setNotice("Test Pack created and selected ISOs composed atomically.")
        setSelected(createdId ?? null); setSelectedAvailable([])
      }
      await refresh(selected)
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Test Pack mutation failed") }
    finally { setSubmitting(false) }
  }
  const addMembers = async () => {
    if (!selected || !canManage) return
    try { for (const isoId of selectedAvailable) await composeManagedTestPack(getSupabaseBrowserClient(), selected, isoId); setSelectedAvailable([]); await refresh(selected); setNotice("ISO membership updated by server.") } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not compose ISO") }
  }
  const removeMember = async (isoId: string) => { if (!selected || !canManage || !window.confirm("Remove this ISO from the Test Pack?")) return; try { await removeManagedTestPackIsometric(getSupabaseBrowserClient(), selected, isoId); await refresh(selected); setNotice("ISO removed; history retained.") } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not remove ISO") } }
  const moveMember = async (isoId: string, destination: string) => { if (!selected || !destination || !canManage || !window.confirm("Move this ISO to the selected Test Pack?")) return; try { await moveManagedTestPackIsometric(getSupabaseBrowserClient(), selected, isoId, destination); await refresh(selected); setNotice("ISO moved by the server; source and destination revisions refreshed.") } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not move ISO") } }
  const archive = async () => { if (!selected || !canManage || !window.confirm("Archive this Test Pack? This makes it read-only.")) return; try { await archiveManagedTestPack(getSupabaseBrowserClient(), selected); await refresh(selected); setNotice("Test Pack archived.") } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not archive Test Pack") } }

  return <div className="space-y-6"><div><h1 className="text-2xl font-semibold">Test Pack Builder</h1><p className="text-sm text-muted-foreground">Whole-ISO composition. Readiness, lifecycle, and duplicate membership remain server-owned.</p></div>{error && <p className="text-sm text-destructive">{error}</p>}{notice && <p className="text-sm text-emerald-700">{notice}</p>}<div className="grid gap-6 lg:grid-cols-[18rem_1fr]"><Card><CardHeader><CardTitle>Test Packs</CardTitle></CardHeader><CardContent className="space-y-2">{loading && <Skeleton className="h-24 w-full" />}{packs.map((pack) => <button type="button" key={pack.id} onClick={() => setSelected(pack.id)} className={`flex w-full justify-between rounded border p-3 text-left text-sm ${selected === pack.id ? "bg-muted" : "hover:bg-muted"}`}><span>{pack.testPackNumber}</span><span>rev {pack.revisionNo} · {pack.activeIsoCount} ISO</span></button>)}{!loading && packs.length === 0 && <p className="text-sm text-muted-foreground">No Test Packs.</p>}<Button type="button" variant="outline" className="w-full" onClick={() => { setSelected(null); setForm(emptyForm); setMembers([]) }} disabled={!canManage}>New Test Pack</Button></CardContent></Card><div className="space-y-6"><Card><CardHeader><CardTitle>{selected ? "Definition and metadata" : "Create Test Pack"}</CardTitle></CardHeader><CardContent><form className="grid gap-3 sm:grid-cols-2" onSubmit={submit}>{TEXT_FIELDS.map((field) => <label key={field} className="text-xs text-muted-foreground">{field}<Input required={!["volumeM3"].includes(field)} type={field.includes("On") ? "date" : ["pressure", "volumeM3"].includes(field) ? "number" : "text"} value={form[field]} onChange={(event) => updateField(field, event.target.value)} disabled={!canManage} /></label>)}{REFERENCE_FIELDS.map(({ field, label }) => { const options = optionsFor(field); return <label key={field} className="text-xs text-muted-foreground">{label}<select required className="h-9 w-full rounded border bg-transparent px-3 text-sm" value={form[field]} onChange={(event) => updateField(field, event.target.value)} disabled={!canManage || options.length === 0}><option value="">{field === "subsystemId" && !form.systemId ? "Select a System first" : options.length === 0 ? `No active ${label.toLowerCase()} in this project` : `Select ${label.toLowerCase()}`}</option>{options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label> })}<label className="text-xs text-muted-foreground">medium<select className="h-9 w-full rounded border bg-transparent px-3 text-sm" value={form.medium} onChange={(event) => updateField("medium", event.target.value)} disabled={!canManage}><option value="H">Hydro</option><option value="P">Pneumatic</option><option value="V">Visual</option></select></label><div className="flex items-end gap-2"><Button type="submit" disabled={!canManage || submitting}>{submitting ? "Saving…" : selected ? "Save metadata" : "Create and compose"}</Button>{selected && <Button type="button" variant="destructive" onClick={() => void archive()} disabled={!canManage}>Archive</Button>}</div></form><p className="mt-3 text-xs text-muted-foreground">{canManage ? "Mutations use capability-checked RPCs and refresh projections after success." : "View-only access: mutation controls are disabled."}</p></CardContent></Card><div className="grid gap-6 md:grid-cols-2"><Card><CardHeader><CardTitle>Current ISO members</CardTitle></CardHeader><CardContent className="space-y-2">{selected ? members.map((member) => <div key={member.id} className="space-y-2 rounded border p-2 text-sm"><div className="flex items-center justify-between"><span>{member.iso_number ?? isoLabelById.get(member.isometric_id ?? "") ?? member.isometric_id}</span><Button type="button" size="sm" variant="outline" onClick={() => void removeMember(member.isometric_id ?? "")} disabled={!canManage}>Remove</Button></div><label className="flex items-center gap-2 text-xs text-muted-foreground">Move to<select className="h-8 flex-1 rounded border bg-transparent px-2" defaultValue="" onChange={(event) => void moveMember(member.isometric_id ?? "", event.target.value)} disabled={!canManage}><option value="">Select destination</option>{packs.filter((pack) => pack.id !== selected && pack.lifecycle !== "archived").map((pack) => <option key={pack.id} value={pack.id}>{pack.testPackNumber}</option>)}</select></label></div>) : <p className="text-sm text-muted-foreground">Create or select a Test Pack.</p>}{selected && <p className="text-xs text-muted-foreground">Removal/move is rejected by the server once workflow evidence exists.</p>}</CardContent></Card><Card><CardHeader><CardTitle>Available accepted ISOs</CardTitle></CardHeader><CardContent className="space-y-2">{availableOptions.map((option) => <label key={option.id} className="flex items-center gap-2 rounded border p-2 text-sm"><input type="checkbox" checked={selectedAvailable.includes(option.id)} onChange={(event) => setSelectedAvailable((current) => event.target.checked ? [...current, option.id] : current.filter((id) => id !== option.id))} disabled={!canManage} /><span>{option.label}</span><span className="ml-auto text-xs text-muted-foreground">{option.isRft ? "RFT" : "Blocked"}</span></label>)}{availableOptions.length === 0 &&<p className="text-sm text-muted-foreground">No available accepted ISOs in this project scope.</p>}{selected && <Button type="button" onClick={() => void addMembers()} disabled={!canManage || selectedAvailable.length === 0}>Add selected ISOs</Button>}</CardContent></Card></div></div></div></div>
}
