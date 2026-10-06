"use client"

import { useMemo } from "react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { AlertCircle, CheckCircle2, ChevronRight, ExternalLink, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { linkFrom } from "@/components/pipeqc/workspace-model"
import { useOptionalAccess } from "@/modules/access/ui/access-context"
import type {
  TestPackCatalogRow,
  TestPackIsoStatusRow,
  TestPackMemberRow,
  TestPackReadinessRow,
  TestPackSpoolStatusRow,
} from "../infrastructure/supabase-pressure-test-repository"
import type { TestPackMode, TestPackOperation } from "./test-pack-workspace-model"
import { useOptionalTestPackWorkspaceContext } from "./test-pack-workspace-context"

export interface TestPackReadinessPanelProps {
  projectId: string
  pack: TestPackCatalogRow
  readiness: TestPackReadinessRow | null
  members: readonly TestPackMemberRow[]
  isoStatus: readonly TestPackIsoStatusRow[]
  spools: readonly TestPackSpoolStatusRow[]
  selectedSpoolRevisionId?: string | null
  onSelectSpool?: (spoolRevisionId: string | null) => void
  onNavigateWorkflow?: (operation: TestPackOperation, mode: TestPackMode) => void
}

export function TestPackReadinessPanel({
  projectId: _projectId,
  pack: _pack,
  readiness,
  members,
  isoStatus,
  spools,
  selectedSpoolRevisionId,
  onSelectSpool,
  onNavigateWorkflow,
}: TestPackReadinessPanelProps) {
  const workspace = useOptionalTestPackWorkspaceContext()
  const access = useOptionalAccess()
  const can = access?.can
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const here = searchParams.toString() ? `${pathname}?${searchParams.toString()}` : pathname

  // Mapping from isometric_id to business ISO number
  const isoNumberMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const member of members) {
      if (member.isometric_id) {
        map.set(member.isometric_id, member.iso_number ?? member.isometric_id)
      }
    }
    return map
  }, [members])

  // Verified selected spool in this pack
  const selectedSpool = useMemo(() => {
    if (!selectedSpoolRevisionId) return null
    return (
      spools.find((s) => s.spool_revision_id === selectedSpoolRevisionId) ?? null
    )
  }, [selectedSpoolRevisionId, spools])

  const safeLink = (path: string, spoolRevId?: string | null) => {
    let url = path
    if (spoolRevId) {
      const sep = url.includes("?") ? "&" : "?"
      url = `${url}${sep}spool=${encodeURIComponent(spoolRevId)}`
    }
    return linkFrom(url, here)
  }

  if (!readiness) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center p-8 space-y-4 text-center">
          <AlertCircle className="h-10 w-10 text-amber-600" />
          <div>
            <h3 className="text-lg font-semibold">Readiness unavailable</h3>
            <p className="text-sm text-muted-foreground">
              Readiness facts could not be loaded from the server projection.
            </p>
          </div>
          {workspace && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => void workspace.refresh()}
              disabled={workspace.loading}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry loading readiness
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  const isRft = readiness.isRft
  const memberCount = readiness.memberCount ?? members.length
  const weldTotal = readiness.weld_total ?? 0
  const flangeTotal = readiness.flange_total ?? 0
  const ndePending = readiness.nde_pending_count ?? 0
  const pwhtPending = readiness.pwht_pending_count ?? 0
  const linePending = readiness.line_check_pending_count ?? 0
  const xOpen = readiness.x_open_count ?? 0

  const totalBlockerFacts = ndePending + pwhtPending + linePending + xOpen
  const unexplainedBlocker =
    !isRft && totalBlockerFacts === 0 && memberCount > 0

  return (
    <div className="space-y-6">
      {/* Top verdict card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-semibold">
            Server Readiness Verdict
          </CardTitle>
          <Badge variant={isRft ? "default" : "destructive"}>
            {isRft ? "Ready For Test" : "Blocked"}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            {isRft ? (
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            ) : (
              <AlertCircle className="h-6 w-6 text-destructive" />
            )}
            <div>
              <p className="font-medium text-sm">
                {isRft
                  ? "All 12 readiness criteria satisfied. Eligible for downstream pressure test operations."
                  : memberCount === 0
                    ? "Test Pack has no isometric members. Add isometrics in Composition."
                    : unexplainedBlocker
                      ? "Readiness could not be explained from these facts. Refresh recommended."
                      : "The pack is blocked by upstream construction or inspection requirements."}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Rev {readiness.revisionNo} · {memberCount} member isometrics
              </p>
            </div>
          </div>

          {unexplainedBlocker && workspace && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => void workspace.refresh()}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh facts
            </Button>
          )}

          {/* Facts grid */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6 pt-2 border-t text-sm">
            <div className="rounded border p-2">
              <span className="text-xs text-muted-foreground block">Members</span>
              <span className="font-semibold">{memberCount} ISO</span>
            </div>
            <div className="rounded border p-2">
              <span className="text-xs text-muted-foreground block">Welds</span>
              <span className="font-semibold">{weldTotal}</span>
            </div>
            <div className="rounded border p-2">
              <span className="text-xs text-muted-foreground block">Flanges</span>
              <span className="font-semibold">{flangeTotal}</span>
            </div>
            <div className={`rounded border p-2 ${ndePending > 0 ? "border-amber-400 bg-amber-50/50" : ""}`}>
              <span className="text-xs text-muted-foreground block">NDE pending</span>
              <span className="font-semibold">{ndePending}</span>
            </div>
            <div className={`rounded border p-2 ${pwhtPending > 0 ? "border-amber-400 bg-amber-50/50" : ""}`}>
              <span className="text-xs text-muted-foreground block">PWHT pending</span>
              <span className="font-semibold">{pwhtPending}</span>
            </div>
            <div className={`rounded border p-2 ${linePending > 0 || xOpen > 0 ? "border-amber-400 bg-amber-50/50" : ""}`}>
              <span className="text-xs text-muted-foreground block">Line Check / X</span>
              <span className="font-semibold">
                {linePending} line · {xOpen} X
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resolution actions table */}
      {!isRft && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Blocker Resolution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {linePending > 0 && (
              <div className="flex items-center justify-between p-2 rounded border text-sm">
                <span>Line Check pending ({linePending} target(s))</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onNavigateWorkflow?.("line_check", "preparation")}
                >
                  Workflow Line Check →
                </Button>
              </div>
            )}

            {xOpen > 0 && (
              <div className="flex items-center justify-between p-2 rounded border text-sm">
                <span>Open Category X Punches ({xOpen} item(s))</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onNavigateWorkflow?.("item_clearance", "preparation")}
                >
                  Workflow Item Clearance →
                </Button>
              </div>
            )}

            {ndePending > 0 && (
              <div className="flex items-center justify-between p-2 rounded border text-sm">
                <span>
                  NDE pending ({ndePending} check(s))
                  {selectedSpool && ` · Spool ${selectedSpool.spool_number}`}
                </span>
                <Link
                  className="inline-flex items-center gap-1 text-xs underline font-medium"
                  href={safeLink("/nde", selectedSpool?.spool_revision_id)}
                >
                  Open NDE <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            )}

            {pwhtPending > 0 && (
              <div className="flex items-center justify-between p-2 rounded border text-sm">
                <span>
                  PWHT pending ({pwhtPending} check(s))
                  {selectedSpool && ` · Spool ${selectedSpool.spool_number}`}
                </span>
                <Link
                  className="inline-flex items-center gap-1 text-xs underline font-medium"
                  href={safeLink("/fabrication/qc-release", selectedSpool?.spool_revision_id)}
                >
                  QC Release <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            )}

            {can?.("erection.view") && (
              <div className="flex items-center justify-between p-2 rounded border text-sm">
                <span>Weld / Support erection status</span>
                <Link
                  className="inline-flex items-center gap-1 text-xs underline font-medium"
                  href={safeLink("/erection", selectedSpool?.spool_revision_id)}
                >
                  Erection Workbench <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            )}

            {can?.("flange.view") && (
              <div className="flex items-center justify-between p-2 rounded border text-sm">
                <span>Flange progress inspection</span>
                <Link
                  className="inline-flex items-center gap-1 text-xs underline font-medium"
                  href={safeLink("/erection/flange-progress")}
                >
                  Flange Progress <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            )}

            {memberCount === 0 && (
              <div className="flex items-center justify-between p-2 rounded border text-sm">
                <span>Missing engineering / isometrics composition</span>
                <Link
                  className="inline-flex items-center gap-1 text-xs underline font-medium"
                  href={safeLink("/spooling/browse")}
                >
                  Spooling browse <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ISO Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Isometric Breakdown ({isoStatus.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {isoStatus.map((iso) => {
              const businessNumber =
                isoNumberMap.get(iso.isometric_id ?? "") ?? iso.isometric_id
              const blockers = (iso.blocker_counts as Record<string, number> | null) ?? {}
              const xCount = blockers.X_OPEN ?? 0
              return (
                <div
                  key={iso.isometric_id}
                  className="flex items-center justify-between p-2.5 rounded border text-sm"
                >
                  <div>
                    <span className="font-medium font-mono">{businessNumber}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {iso.is_rft ? "Ready For Test" : "Ongoing / Blocked"}
                    </span>
                  </div>
                  <div>
                    {xCount > 0 && (
                      <span className="text-xs text-destructive font-medium mr-2">
                        X open: {xCount}
                      </span>
                    )}
                    <Badge variant={iso.is_rft ? "default" : "secondary"}>
                      {iso.is_rft ? "RFT" : "Blocked"}
                    </Badge>
                  </div>
                </div>
              )
            })}
            {isoStatus.length === 0 && (
              <p className="text-sm text-muted-foreground">No isometrics in this pack.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Spool Breakdown */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold">Spool Breakdown ({spools.length})</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Click a spool to scope resolution links to that specific spool.
            </p>
          </div>
          {selectedSpool && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onSelectSpool?.(null)}
            >
              Clear spool selection
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {spools.map((spool) => {
              const isSelected =
                spool.spool_revision_id === selectedSpoolRevisionId
              const spoolRft =
                spool.is_rft === true
                  ? "RFT"
                  : spool.is_rft === false
                    ? "Ongoing"
                    : "Unknown"
              return (
                <button
                  key={spool.spool_revision_id}
                  type="button"
                  className={`w-full flex items-center justify-between p-2.5 rounded border text-sm text-left transition-colors ${
                    isSelected
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "hover:bg-muted"
                  }`}
                  onClick={() =>
                    onSelectSpool?.(isSelected ? null : spool.spool_revision_id ?? null)
                  }
                >
                  <div>
                    <span className="font-mono font-medium">
                      {spool.spool_number ?? spool.spool_revision_id}
                    </span>
                    <span className="ml-3 text-xs text-muted-foreground">
                      NDE pending: {spool.nde_pending ?? 0} · PWHT pending:{" "}
                      {spool.pwht_pending ?? 0}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={spool.is_rft ? "default" : "outline"}>
                      {spoolRft}
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </button>
              )
            })}
            {spools.length === 0 && (
              <p className="text-sm text-muted-foreground">No spools in current projection.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
