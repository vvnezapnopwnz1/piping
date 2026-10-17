"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { Button } from "@/components/ui/button"
import { useWorkContextParam } from "@/components/pipeqc/work-context"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import { useOptionalAccess } from "@/modules/access/ui/access-context"
import { TestPackDossierButton } from "@/modules/documents/ui/test-pack-dossier-button"
import { buildPackSteps, currentStepId, type PackWorkflowRow, type StepId } from "../domain/pack-steps"
import { listTestPackCatalog, type TestPackCatalogRow } from "../infrastructure/supabase-pressure-test-repository"
import { listTestPackWorkflowRows } from "../infrastructure/test-pack-rows"
import { resolvePackSelection } from "./pack-selection"
import { StepBody } from "./steps/step-body"
import { TestPackBuilderScreen } from "./test-pack-builder-screen"
import { TestPackList } from "./test-pack-list"
import { useTestPackTranslations } from "./test-pack-i18n"
import { PackSteps } from "./test-pack-steps"

/**
 * One screen for the pack: the list on the left, the selected pack's step timeline on the right. The server
 * owns every stage, reason and allowed action (test_pack_workflow); this screen only shows them.
 */
export function TestPacksScreen({ projectId, initialStep }: { projectId: string; initialStep?: StepId | null }) {
  const t = useTestPackTranslations()
  const access = useOptionalAccess()
  const canManage = access?.can("testpack.manage") ?? false
  const params = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const [requested, selectPack] = useWorkContextParam("testPack")
  const [packs, setPacks] = useState<TestPackCatalogRow[]>([])
  const [workflows, setWorkflows] = useState<Record<string, PackWorkflowRow>>({})
  const [loaded, setLoaded] = useState(false)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let active = true
    const client = getSupabaseBrowserClient()
    void Promise.all([listTestPackCatalog(client, projectId), listTestPackWorkflowRows(client, projectId)]).then(([catalog, rows]) => {
      if (!active) return
      setPacks(catalog)
      setWorkflows(rows)
      setLoaded(true)
    })
    return () => {
      active = false
    }
  }, [projectId, version])

  const refresh = useCallback(() => setVersion((value) => value + 1), [])
  const selection = resolvePackSelection(packs, requested)
  const pack = selection.kind === "selected" ? (packs.find((candidate) => candidate.id === selection.id) ?? null) : null
  const row = pack ? workflows[pack.id] : undefined
  const steps = useMemo(() => (row ? buildPackSteps(row) : []), [row])
  const current = currentStepId(steps)
  const stepParam = params.get("step") as StepId | null
  const openId: StepId | null =
    stepParam === ("none" as StepId)
      ? null
      : stepParam && steps.some((step) => step.id === stepParam)
        ? stepParam
        : initialStep && steps.some((step) => step.id === initialStep)
          ? initialStep
          : current
  const stages = useMemo(() => Object.fromEntries(Object.entries(workflows).map(([id, value]) => [id, String(value.canonical_state ?? "awaiting_rft")])), [workflows])

  const setStep = (id: StepId | null) => {
    const next = new URLSearchParams(params.toString())
    if (id) next.set("step", id)
    else next.set("step", "none")
    router.replace(`${pathname}?${next.toString()}`, { scroll: false })
  }

  const creating = canManage && params.get("new") === "1" && selection.kind === "none"
  const showingPack = selection.kind !== "none" || creating
  return (
    <div className="flex h-[calc(100dvh-150px)] min-h-[420px] gap-4">
      <div className={`${showingPack ? "hidden lg:flex" : "flex"} w-full min-h-0 flex-col lg:w-[340px] lg:flex-none`}>
        <TestPackList packs={packs} stages={stages} selectedId={pack?.id ?? null} onSelect={(id) => selectPack(id, { push: true, extra: { step: null, new: null } })} onCreate={() => selectPack(null, { push: true, extra: { new: "1", step: null } })} canManage={canManage} />
      </div>
      <section className={`${showingPack ? "block" : "hidden lg:block"} min-h-0 min-w-0 flex-1 overflow-y-auto rounded-lg border bg-card`}>
        {selection.kind === "not_found" && loaded && <p className="p-6 text-sm text-muted-foreground">{t("screen.notFound")}</p>}
        {selection.kind === "none" && !creating && <p className="p-6 text-sm text-muted-foreground">{t("screen.selectPack")}</p>}
        {creating && (
          <div className="p-4">
            <Button size="sm" variant="ghost" className="-ml-2 mb-2 lg:hidden" onClick={() => selectPack(null, { extra: { new: null } })}>{t("screen.back")}</Button>
            <TestPackBuilderScreen projectId={projectId} canManage={canManage} isNew />
          </div>
        )}
        {pack && row && (
          <>
            <header className="sticky top-0 z-20 flex h-[76px] flex-wrap items-center justify-between gap-2 border-b bg-card px-4">
              <div>
                <Button size="sm" variant="ghost" className="-ml-2 lg:hidden" onClick={() => selectPack(null, { extra: { step: null } })}>{t("screen.back")}</Button>
                <h2 className="font-mono text-xl font-semibold">{pack.testPackNumber}</h2>
                <p className="text-sm text-muted-foreground">{t("screen.isoCount", { count: pack.activeIsoCount })} · {t(`screen.stage.${String(row.canonical_state ?? "awaiting_rft")}`)}</p>
              </div>
              <TestPackDossierButton projectId={projectId} testPackId={pack.id} testPackNumber={pack.testPackNumber} />
            </header>
            {!canManage && <p className="mx-4 mt-3 rounded border bg-muted px-3 py-2 text-sm">{t("screen.readOnly")}</p>}
            {canManage && pack.lifecycle === "archived" && <p className="mx-4 mt-3 rounded border bg-muted px-3 py-2 text-sm">{t("screen.archived")}</p>}
            <PackSteps steps={steps} currentId={current} openId={openId} onOpen={setStep} renderBody={(step) => <StepBody step={step} context={{ projectId, pack, canManage: canManage && pack.lifecycle !== "archived", onChanged: refresh }} />} />
          </>
        )}
      </section>
    </div>
  )
}
