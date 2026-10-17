"use client"

import { useTestPackTranslations, reportTestPackError, testPackPriorityLabel } from "@/modules/pressure-test/ui/test-pack-i18n"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { DataTable, useTableUrlState, type DataColumn } from "@/components/ui/data-table"
import { RecordDrawer } from "@/components/ui/record-drawer"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { withProject } from "@/components/pipeqc/project-url"
import { useNameWorkContext, useWorkContextParam } from "@/components/pipeqc/work-context"
import { useRequestLeave } from "@/components/pipeqc/unsaved-input-guard"
import { useSupabaseAuth } from "@/contexts/supabase-auth-context"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import { useOptionalAccess } from "@/modules/access/ui/access-context"
import {
  listTestPackCatalog,
  listTestPackReadiness,
  listTestPackStages,
  type TestPackCatalogRow,
  type TestPackReadinessRow,
} from "../infrastructure/supabase-pressure-test-repository"
import type { PressureTestState } from "../domain/pressure-test-workflow"
import { summarizeWorkflow } from "./pressure-test-ui-model"
import { mediumLabel } from "./test-pack-builder-model"
import { TestPackCompositionEditor } from "./test-pack-composition-editor"
import { TestPackDefinitionEditor } from "./test-pack-definition-editor"
import { TestPackReadinessPanel } from "./test-pack-readiness-panel"
import {
  TestPackWorkspaceProvider,
  useTestPackWorkspaceContext,
} from "./test-pack-workspace-context"
import {
  TEST_PACK_VIEWS,
  testPackMode,
  testPackOperation,
  testPackView,
  type TestPackMode,
  type TestPackOperation,
  type TestPackView,
} from "./test-pack-workspace-model"
import { TestPackDossierButton } from "@/modules/documents/ui/test-pack-dossier-button"

import { TestPackWorkflowPanel } from "./test-pack-workflow-panel"
import styles from "./test-pack-workbench.module.css"

export interface TestPackWorkbenchProps {
  projectId: string
  testPackId?: string
}

type CatalogWithReadiness = TestPackCatalogRow & {
  isRft?: boolean
  /** The server's stage of the pack, `test_pack_workflow.canonical_state`. */
  stage?: PressureTestState
  memberCount?: number
  xOpenCount?: number | null
}

function WorkbenchDrawerHost({
  projectId,
  onCloseDrawer,
}: {
  projectId: string
  onCloseDrawer: () => void
}) {
  const t = useTestPackTranslations()

  const workspace = useTestPackWorkspaceContext()
  const { snapshot, loading, error, unavailableReason, dataCurrent, refresh } = workspace
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const requestLeave = useRequestLeave()
  const access = useOptionalAccess()
  const canManage = access?.can("testpack.manage") ?? false

  const activeView = testPackView(searchParams.get("view"))
  const activeOp = testPackOperation(searchParams.get("operation"))
  const activeMode = testPackMode(searchParams.get("mode"))
  const activeSpool = searchParams.get("spool")

  useNameWorkContext(
    "testPack",
    snapshot?.pack.id ?? null,
    snapshot?.pack.testPackNumber ?? null,
  )

  const updateParam = useCallback(
    (extra: Record<string, string | null>) => {
      const next = new URLSearchParams(window.location.search)
      for (const [key, val] of Object.entries(extra)) {
        if (val) next.set(key, val)
        else next.delete(key)
      }
      const q = next.toString()
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false })
    },
    [pathname, router],
  )

  const handleSelectView = (view: TestPackView) => {
    requestLeave(() => {
      updateParam({ view, operation: null, mode: null })
    })
  }

  const handleSelectOperation = (op: TestPackOperation | null, mode: TestPackMode | null) => {
    requestLeave(() => {
      updateParam({ operation: op, mode })
    })
  }

  const handleSelectSpool = (spoolRevId: string | null) => {
    updateParam({ spool: spoolRevId })
  }

  if (loading && !snapshot) {
    return (
      <RecordDrawer
        kicker={t("text.testPack")}
        title={t("text.loading")}
        meta={t("text.fetchingFacts")}
        returnLabel={t("text.testPacks")}
        closeLabel={t("text.closeDrawer")}
        recordKind="test-pack"
        onClose={onCloseDrawer}
      >
        <div className="p-6">
          <Skeleton className="h-64 w-full" />
        </div>
      </RecordDrawer>
    )
  }

  if (unavailableReason || (error && !snapshot)) {
    return (
      <RecordDrawer
        kicker={t("text.testPack")}
        title={t("text.testPackUnavailable")}
        meta={t("text.selectionError")}
        returnLabel={t("text.testPacks")}
        closeLabel={t("text.closeDrawer")}
        recordKind="test-pack"
        onClose={onCloseDrawer}
      >
        <div className="p-6 space-y-4">
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-6 text-center space-y-3">
              <AlertCircle className="h-10 w-10 text-destructive" />
              <h3 className="text-base font-semibold">
                {unavailableReason ? t(unavailableReason) : error ?? t("text.testPackCouldNotBeFound")}
              </h3>
              <p className="text-sm text-muted-foreground">

                {t("text.thisTestPackMayNotExistInThe")}
              </p>
              <div className="flex gap-2 pt-2">
                {error && (
                  <Button size="sm" variant="outline" onClick={() => void refresh()}>
                    <RefreshCw className="mr-2 h-4 w-4" />

                    {t("text.retry")}
                  </Button>
                )}
                <Button size="sm" onClick={onCloseDrawer}>

                  {t("text.returnToList")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </RecordDrawer>
    )
  }

  if (!snapshot) return null

  const pack = snapshot.pack
  const readiness = snapshot.readiness

  const statusNode = readiness ? (
    <Badge variant={readiness.isRft ? "default" : "secondary"}>
      {readiness.isRft ? t("text.readyForTest162") : t("text.blocked")}
    </Badge>
  ) : (
    <span className="text-xs text-muted-foreground">{t("text.readinessUnavailable")}</span>
  )

  return (
    <RecordDrawer
      kicker={t("text.testPack")}
      title={pack.testPackNumber}
      meta={t("text.packMeta", { revision: pack.revisionNo, count: pack.activeIsoCount })}
      status={
        <div className="flex flex-wrap items-center gap-2">
          {statusNode}
          <TestPackDossierButton projectId={projectId} testPackId={pack.id} testPackNumber={pack.testPackNumber} />
        </div>
      }
      returnLabel={t("text.testPacks")}
      closeLabel={t("text.closePack", { number: pack.testPackNumber })}
      recordKind="test-pack"
      onClose={onCloseDrawer}
    >
      <div className={styles.drawerContent}>
        {/* Four areas navigation */}
        <nav className={styles.viewNav} aria-label={t("text.testPackAreas")}>
          {TEST_PACK_VIEWS.map((view) => (
            <button
              key={view}
              type="button"
              className={styles.viewNavButton}
              data-active={activeView === view ? "" : undefined}
              onClick={() => handleSelectView(view)}
            >
              <span className="capitalize">{t(`view.${view}`)}</span>
            </button>
          ))}
        </nav>

        <div className={styles.viewContent}>
          {activeView === "readiness" && (
            <TestPackReadinessPanel
              projectId={projectId}
              pack={pack}
              readiness={readiness}
              members={snapshot.members}
              isoStatus={snapshot.isoStatus}
              spools={snapshot.spoolStatus}
              selectedSpoolRevisionId={activeSpool}
              onSelectSpool={handleSelectSpool}
              onNavigateWorkflow={(op, mode) => {
                requestLeave(() => {
                  updateParam({ view: "workflow", operation: op, mode })
                })
              }}
            />
          )}

          {activeView === "definition" && (
            <TestPackDefinitionEditor
              projectId={projectId}
              pack={pack}
              canManage={canManage}
              dataCurrent={dataCurrent}
              onUpdated={() => void refresh()}
              onArchived={() => void refresh()}
            />
          )}

          {activeView === "composition" && (
            <TestPackCompositionEditor
              projectId={projectId}
              pack={pack}
              canManage={canManage}
              dataCurrent={dataCurrent}
              onComposed={() => void refresh()}
            />
          )}

          {activeView === "workflow" && (
            <TestPackWorkflowPanel
              projectId={projectId}
              pack={pack}
              canManage={canManage}
              dataCurrent={dataCurrent}
              currentOperation={activeOp}
              currentMode={activeMode}
              onSelectOperation={handleSelectOperation}
            />
          )}
        </div>
      </div>
    </RecordDrawer>
  )
}

export function TestPackWorkbench({ projectId, testPackId }: TestPackWorkbenchProps) {
  const t = useTestPackTranslations()
  const catalogColumns: DataColumn<CatalogWithReadiness>[] = [
  {
    id: "testPackNumber",
    header: t("text.testPackNumber"),
    searchable: true,
    value: (row) => row.testPackNumber,
  },
  {
    id: "revisionNo",
    header: t("text.rev123"),
    numeric: true,
    value: (row) => row.revisionNo,
  },
  {
    id: "lifecycle",
    header: t("text.lifecycle"),
    filter: "select",
    value: (row) => t(`codes.status.${row.lifecycle}`),
    cell: (row) => (
      <Badge variant={row.lifecycle === "archived" ? "outline" : "default"}>
        {t(`codes.status.${row.lifecycle}`)}
      </Badge>
    ),
  },
  {
    id: "activeIsoCount",
    header: t("text.isos"),
    numeric: true,
    value: (row) => row.activeIsoCount,
    filter: "number",
  },
  {
    id: "readiness",
    header: t("text.stage"),
    filter: "select",
    value: (row) => (row.stage ? t(summarizeWorkflow({ canonicalState: row.stage }).label) : "—"),
    cell: (row) => {
      if (!row.stage) return <span className="text-muted-foreground">—</span>
      const summary = summarizeWorkflow({ canonicalState: row.stage })
      return <Badge variant={summary.tone === "blocked" ? "secondary" : "default"}>{t(summary.label)}</Badge>
    },
  },
  {
    id: "location",
    header: t("text.location"),
    searchable: true,
    filter: "select",
    value: (row) => row.location ?? "—",
  },
  {
    id: "priority",
    header: t("text.priority"),
    filter: "select",
    value: (row) => testPackPriorityLabel(row.priority, t),
  },
  {
    id: "medium",
    header: t("text.medium"),
    filter: "select",
    value: (row) => t(mediumLabel(row.medium)),
  },
]

  const auth = useSupabaseAuth()
  const activityCode = auth.access?.activityCode
  const [catalogRows, setCatalogRows] = useState<CatalogWithReadiness[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tableState, setTableState] = useTableUrlState({ namespace: "tp" })
  const [, setTestPackParam] = useWorkContextParam("testPack")
  const requestLeave = useRequestLeave()

  // Load catalog list and readiness overview
  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    const client = getSupabaseBrowserClient()

    void Promise.all([
      listTestPackCatalog(client, projectId),
      listTestPackReadiness(client, projectId),
      listTestPackStages(client, projectId),
    ])
      .then(([catalog, readiness, stages]) => {
        if (!active) return
        const readinessMap = new Map<string, TestPackReadinessRow>()
        for (const r of readiness) {
          readinessMap.set(r.testPackId, r)
        }

        const merged: CatalogWithReadiness[] = catalog.map((row) => {
          const r = readinessMap.get(row.id)
          return {
            ...row,
            isRft: r?.isRft,
            stage: stages[row.id] as PressureTestState | undefined,
            memberCount: r?.memberCount,
            xOpenCount: r?.x_open_count,
          }
        })

        setCatalogRows(merged)
      })
      .catch((cause) => {
        if (active) setError(reportTestPackError(cause, t("text.failedToLoadTestPacks")))
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [projectId])

  const handleOpenPack = (id: string) => {
    // A pack past RFT opens on its workflow, where the next step is; a blocked pack opens on its readiness.
    const stage = catalogRows.find((row) => row.id === id)?.stage
    const view = stage && stage !== "awaiting_rft" ? "workflow" : "readiness"
    requestLeave(() => {
      setTestPackParam(id, { push: true, extra: { view, operation: null, mode: null, spool: null } })
    })
  }

  const handleCloseDrawer = () => {
    requestLeave(() => {
      setTestPackParam(null, { extra: { view: null, operation: null, mode: null, spool: null } })
    })
  }

  return (
    <div className={styles.workbenchLayout}>
      <div className={styles.listPane}>
        <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
          <div>
            <h1 className="text-2xl font-semibold">{t("text.testPackExplorer")}</h1>
          </div>
        </div>

        {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

        <DataTable
          rows={catalogRows}
          columns={catalogColumns}
          state={tableState}
          onStateChange={setTableState}
          rowId={(row) => row.id}
          loading={loading}
          onRowClick={(row) => handleOpenPack(row.id)}
          emptyTitle={t("text.noPacks")}
          emptyAction={
            <Button asChild size="sm">
              <Link href={withProject("/testpack/builder", activityCode)}>

                {t("text.createTestPack")}
              </Link>
            </Button>
          }
        />
      </div>

      {testPackId && (
        <TestPackWorkspaceProvider projectId={projectId} testPackId={testPackId}>
          <WorkbenchDrawerHost projectId={projectId} onCloseDrawer={handleCloseDrawer} />
        </TestPackWorkspaceProvider>
      )}
    </div>
  )
}
