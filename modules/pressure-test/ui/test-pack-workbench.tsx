"use client"

import { useCallback, useEffect, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { DataTable, useTableUrlState, type DataColumn } from "@/components/ui/data-table"
import { RecordDrawer } from "@/components/ui/record-drawer"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { useNameWorkContext, useWorkContextParam } from "@/components/pipeqc/work-context"
import { useRequestLeave } from "@/components/pipeqc/unsaved-input-guard"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import { useOptionalAccess } from "@/modules/access/ui/access-context"
import {
  listTestPackCatalog,
  listTestPackReadiness,
  type TestPackCatalogRow,
  type TestPackReadinessRow,
} from "../infrastructure/supabase-pressure-test-repository"
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
import { TestPackWorkflowPanel } from "./test-pack-workflow-panel"
import styles from "./test-pack-workbench.module.css"

export interface TestPackWorkbenchProps {
  projectId: string
  testPackId?: string
}

type CatalogWithReadiness = TestPackCatalogRow & {
  isRft?: boolean
  memberCount?: number
  xOpenCount?: number | null
}

const catalogColumns: DataColumn<CatalogWithReadiness>[] = [
  {
    id: "testPackNumber",
    header: "Test Pack number",
    searchable: true,
    value: (row) => row.testPackNumber,
  },
  {
    id: "revisionNo",
    header: "Rev",
    numeric: true,
    value: (row) => row.revisionNo,
  },
  {
    id: "lifecycle",
    header: "Lifecycle",
    filter: "select",
    value: (row) => row.lifecycle,
    cell: (row) => (
      <Badge variant={row.lifecycle === "archived" ? "outline" : "default"}>
        {row.lifecycle}
      </Badge>
    ),
  },
  {
    id: "activeIsoCount",
    header: "ISOs",
    numeric: true,
    value: (row) => row.activeIsoCount,
    filter: "number",
  },
  {
    id: "readiness",
    header: "Readiness",
    filter: "select",
    value: (row) => (row.isRft ? "Ready For Test" : "Blocked"),
    cell: (row) =>
      row.isRft !== undefined ? (
        <Badge variant={row.isRft ? "default" : "secondary"}>
          {row.isRft ? "RFT" : "Blocked"}
        </Badge>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    id: "location",
    header: "Location",
    searchable: true,
    filter: "select",
    value: (row) => row.location ?? "—",
  },
  {
    id: "priority",
    header: "Priority",
    filter: "select",
    value: (row) => row.priority ?? "Normal",
  },
  {
    id: "medium",
    header: "Medium",
    filter: "select",
    value: (row) => mediumLabel(row.medium),
  },
]

function WorkbenchDrawerHost({
  projectId,
  onCloseDrawer,
}: {
  projectId: string
  onCloseDrawer: () => void
}) {
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
        kicker="Test Pack"
        title="Loading…"
        meta="Fetching Test Pack facts"
        returnLabel="Test Packs"
        closeLabel="Close Test Pack drawer"
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
        kicker="Test Pack"
        title="Test Pack Unavailable"
        meta="Selection error"
        returnLabel="Test Packs"
        closeLabel="Close Test Pack drawer"
        recordKind="test-pack"
        onClose={onCloseDrawer}
      >
        <div className="p-6 space-y-4">
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-6 text-center space-y-3">
              <AlertCircle className="h-10 w-10 text-destructive" />
              <h3 className="text-base font-semibold">
                {unavailableReason ?? error ?? "Test Pack could not be found."}
              </h3>
              <p className="text-sm text-muted-foreground">
                This test pack may not exist in the active project scope or the request failed.
              </p>
              <div className="flex gap-2 pt-2">
                {error && (
                  <Button size="sm" variant="outline" onClick={() => void refresh()}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Retry
                  </Button>
                )}
                <Button size="sm" onClick={onCloseDrawer}>
                  Return to list
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
      {readiness.isRft ? "Ready For Test" : "Blocked"}
    </Badge>
  ) : (
    <span className="text-xs text-muted-foreground">Readiness unavailable</span>
  )

  return (
    <RecordDrawer
      kicker="Test Pack"
      title={pack.testPackNumber}
      meta={`rev ${pack.revisionNo} · ${pack.activeIsoCount} ISO`}
      status={statusNode}
      returnLabel="Test Packs"
      closeLabel={`Close Test Pack ${pack.testPackNumber}`}
      recordKind="test-pack"
      onClose={onCloseDrawer}
    >
      <div className={styles.drawerContent}>
        {/* Four areas navigation */}
        <nav className={styles.viewNav} aria-label="Test pack areas">
          {TEST_PACK_VIEWS.map((view) => (
            <button
              key={view}
              type="button"
              className={styles.viewNavButton}
              data-active={activeView === view ? "" : undefined}
              onClick={() => handleSelectView(view)}
            >
              <span className="capitalize">{view}</span>
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
    ])
      .then(([catalog, readiness]) => {
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
            memberCount: r?.memberCount,
            xOpenCount: r?.x_open_count,
          }
        })

        setCatalogRows(merged)
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : "Failed to load Test Packs")
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [projectId])

  const handleOpenPack = (id: string) => {
    requestLeave(() => {
      setTestPackParam(id, { push: true, extra: { view: "readiness", operation: null, mode: null, spool: null } })
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
            <h1 className="text-2xl font-semibold">Test Pack Explorer</h1>
            <p className="text-sm text-muted-foreground">
              Select a Test Pack to inspect composition, readiness, and workflow operations.
            </p>
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
          emptyTitle="No Test Packs visible in this project scope."
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
