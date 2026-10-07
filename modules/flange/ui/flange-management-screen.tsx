"use client"

import { useTranslations } from "next-intl"
import { useCallback, useEffect, useMemo, useState } from "react"
import { ChevronRight } from "lucide-react"
import { toast } from "sonner"

import { errorDetail } from "@/i18n/format"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/ui/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { DataTable, useTableUrlState, type DataColumn } from "@/components/ui/data-table"
import { ChangeHighlight, IdentityHeadline } from "@/components/ui/record-target"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import type { FlangeValidationCode } from "../domain/flange-progress"
import { recordFlangeProgress } from "../application/record-flange-progress"
import type { FlangeFormOptions, FlangeWorklistItem } from "../application/record-flange-progress"
import { listFlangeFormOptions, listFlangeHistory, listFlangeWorklist, recordFlangeProgress as saveFlangeProgress } from "../infrastructure/supabase-flange-repository"

const today = () => new Date().toISOString().slice(0, 10)
const text = (row: Record<string, unknown>, key: string) => String(row[key] ?? "")

type FlangeColumnsTranslator = ReturnType<typeof useTranslations<"flange.columns">>

function flangeColumns(t: FlangeColumnsTranslator): ReadonlyArray<DataColumn<FlangeWorklistItem>> {
  return [
  { id: "flangeNumber", header: t("flange"), value: (row) => row.flangeNumber, searchable: true, filter: "text", pinned: true, alwaysVisible: true, className: "font-mono text-xs" },
  { id: "isoSpool", header: t("isoSpool"), value: (row) => `${row.isoNumber ?? ""} / ${row.spoolNumber ?? ""}`, searchable: true, filter: "text" },
  { id: "revisionNumber", header: t("rev"), value: (row) => row.revisionNumber, filter: "select" },
  { id: "linePds", header: t("linePds"), value: (row) => `${row.lineNumber ?? ""} / ${row.pdsCode ?? ""}`, searchable: true, filter: "text" },
  { id: "flangeRating", header: t("rating"), value: (row) => row.flangeRating, filter: "select" },
  {
    id: "progressState",
    header: t("status"),
    value: (row) => row.progressState ?? "not_started",
    filter: "select",
    cell: (row) => <StatusBadge status={row.progressState ?? "not_started"} />,
  },
  {
    id: "calculatedUt",
    header: t("ut"),
    numeric: true,
    value: (row) => row.calculatedUt,
    filter: "number",
    cell: (row) => row.calculatedUt ?? t("notConfigured"),
  },
  {
    id: "open",
    header: "",
    sortable: false,
    alwaysVisible: true,
    value: () => "",
    headerClassName: "w-8",
    className: "text-muted-foreground w-8",
    cell: () => <ChevronRight className="h-4 w-4" aria-hidden="true" />,
  },
  ]
}

export function FlangeManagementScreen({ projectId, canManage, mode = "operate" }: { projectId: string; canManage: boolean; mode?: "browse" | "operate" }) {
  const tcol = useTranslations("flange.columns")
  const tf = useTranslations("flange")
  const columnsList = useMemo(() => flangeColumns(tcol), [tcol])
  const t = useTranslations("flange.management")
  const [rows, setRows] = useState<FlangeWorklistItem[]>([])
  const [options, setOptions] = useState<FlangeFormOptions>({ categories: [], torquingRequirements: [], jointers: [] })
  const [history, setHistory] = useState<Array<Record<string, unknown>>>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [jointCategoryId, setJointCategoryId] = useState("")
  const [torquingRequirementId, setTorquingRequirementId] = useState("")
  const [jointingValue, setJointingValue] = useState("")
  const [jointDate, setJointDate] = useState(today())
  const [reportNumber, setReportNumber] = useState("")
  const [tagNumber, setTagNumber] = useState("")
  const [jointerIds, setJointerIds] = useState<string[]>([])
  const [tableState, setTableState] = useTableUrlState({ namespace: "flange" })

  const selected = useMemo(() => rows.find((row) => row.flangeJointRevisionId === selectedId) ?? null, [rows, selectedId])
  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const client = getSupabaseBrowserClient()
      const [nextRows, nextOptions] = await Promise.all([listFlangeWorklist(client, projectId), listFlangeFormOptions(client, projectId)])
      setRows(nextRows)
      setOptions(nextOptions)
      // Keep the selection if the reload still carries it, otherwise nothing. Falling back to the
      // first row put a record form in front of the operator pointed at a flange they never
      // picked — and the form now names its target in a headline, which makes that misleading
      // rather than merely untidy.
      setSelectedId((current) => current && nextRows.some((row) => row.flangeJointRevisionId === current) ? current : null)
    } catch (error: unknown) {
      toast.error(t("flangeWorklistCouldNotBe"), { description: errorDetail(error) })
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { void reload() }, [reload])
  useEffect(() => {
    if (!selectedId) { setHistory([]); return }
    void listFlangeHistory(getSupabaseBrowserClient(), projectId, selectedId).then(setHistory).catch((error: unknown) => toast.error(t("flangeHistoryCouldNotBe"), { description: errorDetail(error) }))
  }, [projectId, selectedId])

  const submit = async () => {
    if (!canManage || !selected) return
    setSaving(true)
    try {
      const result = await recordFlangeProgress(
        { listFlangeWorklist: async () => [], listFlangeHistory: async () => [], listFlangeFormOptions: async () => options,
          recordFlangeProgress: (input) => saveFlangeProgress(getSupabaseBrowserClient(), input),
          materializeFlangeProgressCopies: async () => ({ createdCount: 0 }) },
        {
          projectId, flangeJointRevisionId: selected.flangeJointRevisionId, jointCategoryId, torquingRequirementId,
          jointingValue: Number(jointingValue), jointDate, reportNumber, tagNumber, jointerIds, idempotencyKey: crypto.randomUUID(),
          replacesProgressId: selected.effectiveProgressId ?? undefined,
        },
      )
      if (!result.ok) { const code = Object.values(result.errors)[0] as FlangeValidationCode | undefined; toast.error(code ? tf(`validation.${code}`) : t("checkTheForm")); return }
      toast.success(t("flangeProgressRecorded"))
      setReportNumber(""); setTagNumber(""); setJointingValue("")
      await reload()
    } catch (error: unknown) {
      toast.error(t("flangeProgressCouldNotBe"), { description: errorDetail(error) })
    } finally { setSaving(false) }
  }

  if (loading) return <Skeleton className="h-64 w-full" />

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{t("flangeWorklist")}</CardTitle>
          <CardDescription>{t("currentAcceptedFlangeDefinitionsAnd")}</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columnsList}
            rows={rows}
            state={tableState}
            onStateChange={setTableState}
            rowId={(row) => row.flangeJointRevisionId}
            onRowClick={(row) => setSelectedId(row.flangeJointRevisionId)}
            selectedRowId={selectedId}
            searchPlaceholder={t("searchFlangeIsoSpoolOr")}
            emptyTitle={t("noFlangeJointsInThe")}
            emptyDescription={t("flangeJointsAppearOnceAn")}
          />
        </CardContent>
      </Card>

      {!selected && rows.length > 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-6 text-sm">
            {t("selectAFlangeJointAbove")}
          </CardContent>
        </Card>
      ) : null}

      {selected && <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {mode === "browse" ? null :
        <ChangeHighlight
          id={selected.flangeJointRevisionId}
          announce={t("nowRecording", { flange: selected.flangeNumber ?? t("joint") })}
        >
        <Card>
          <CardHeader>
            <IdentityHeadline
              kind={t("recordingFlangeJoint")}
              identity={selected.flangeNumber ?? "Flange"}
              meta={[selected.isoNumber, selected.spoolNumber, selected.flangeRating]
                .filter(Boolean)
                .join(" · ")}
              status={<StatusBadge status={selected.progressState ?? "not_started"} />}
            />
            <CardDescription>{selected.progressState === "completed" ? t("correctionCreatesANewImmutable") : t("recordTheJointingEventOnce")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {canManage ? <>
              <label className="block text-sm">{t("jointCategory")}<select className="mt-1 w-full rounded-md border bg-background p-2" value={jointCategoryId} onChange={(event) => setJointCategoryId(event.target.value)}><option value="">{t("selectCategory")}</option>{options.categories.map((item) => <option key={text(item, "id")} value={text(item, "id")}>{text(item, "category_code")} — {text(item, "reason")}</option>)}</select></label>
              <label className="block text-sm">{t("torquingRequirement")}<select className="mt-1 w-full rounded-md border bg-background p-2" value={torquingRequirementId} onChange={(event) => setTorquingRequirementId(event.target.value)}><option value="">{t("selectRequirement")}</option>{options.torquingRequirements.map((item) => <option key={text(item, "id")} value={text(item, "id")}>{text(item, "code")} — {text(item, "description")}</option>)}</select></label>
              <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">{t("jointingValue")}<Input type="number" min="0.01" value={jointingValue} onChange={(event) => setJointingValue(event.target.value)} /></label><label className="text-sm">{t("jointDate")}<Input type="date" value={jointDate} onChange={(event) => setJointDate(event.target.value)} /></label><label className="text-sm">{t("reportNumber")}<Input value={reportNumber} onChange={(event) => setReportNumber(event.target.value)} /></label><label className="text-sm">{t("tagNumber")}<Input value={tagNumber} onChange={(event) => setTagNumber(event.target.value)} /></label></div>
              <fieldset><legend className="text-sm">{t("jointers")}</legend><div className="grid gap-1 sm:grid-cols-2">{options.jointers.map((item) => { const id = text(item, "id"); return <label key={id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={jointerIds.includes(id)} onChange={(event) => setJointerIds((current) => event.target.checked ? [...current, id] : current.filter((value) => value !== id))} />{text(item, "code")} — {text(item, "description")}</label> })}</div></fieldset>
              <Button loading={saving} onClick={() => void submit()}>{selected.effectiveProgressId ? t("recordCorrection") : t("recordFlangeProgress")}</Button>
            </> : <p className="text-sm text-muted-foreground">{t("youHaveReadOnlyAccess")}</p>}
          </CardContent>
        </Card>
        </ChangeHighlight>}
        <Card><CardHeader><CardTitle>{t("history")}</CardTitle><CardDescription>{t("appendOnlyRecordsForThis")}</CardDescription></CardHeader><CardContent><div className="space-y-2 text-sm">{history.map((item) => <div key={text(item, "id")} className="rounded border p-2"><div className="flex justify-between"><span>{text(item, "report_number")} · {text(item, "tag_number")}</span><Badge variant="outline">{text(item, "source_kind")}</Badge></div><div className="text-muted-foreground">{text(item, "joint_date")} {t("historyValues", { value: text(item, "jointing_value"), ut: text(item, "calculated_ut") || t("notConfigured") })}</div></div>)}{history.length === 0 && <p className="text-muted-foreground">{t("noProgressHistory")}</p>}</div></CardContent></Card>
      </div>}
    </div>
  )
}
