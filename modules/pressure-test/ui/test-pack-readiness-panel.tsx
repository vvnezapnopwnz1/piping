"use client"

import { useTestPackTranslations } from "@/modules/pressure-test/ui/test-pack-i18n"

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
  const t = useTestPackTranslations()

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
            <h3 className="text-lg font-semibold">{t("text.readinessUnavailable")}</h3>
            <p className="text-sm text-muted-foreground">

              {t("text.readinessFactsCouldNotBeLoadedFromThe")}
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

              {t("text.retryLoadingReadiness")}
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

            {t("text.serverReadinessVerdict")}
          </CardTitle>
          <Badge variant={isRft ? "default" : "destructive"}>
            {isRft ? t("text.readyForTest162") : t("text.blocked")}
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
                  ? t("text.all12ReadinessCriteriaSatisfiedEligibleForDownstream")
                  : memberCount === 0
                    ? t("text.testPackHasNoIsometricMembersAddIsometrics")
                    : unexplainedBlocker
                      ? t("text.readinessCouldNotBeExplainedFromTheseFacts")
                      : t("text.thePackIsBlockedByUpstreamConstructionOr")}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">

                {t("text.rev123")} {readiness.revisionNo} · {memberCount}  {t("text.memberIsometrics")}
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

              {t("text.refreshFacts")}
            </Button>
          )}

          {/* Facts grid */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6 pt-2 border-t text-sm">
            <div className="rounded border p-2">
              <span className="text-xs text-muted-foreground block">{t("text.members")}</span>
              <span className="font-semibold">{memberCount} ISO</span>
            </div>
            <div className="rounded border p-2">
              <span className="text-xs text-muted-foreground block">{t("text.welds")}</span>
              <span className="font-semibold">{weldTotal}</span>
            </div>
            <div className="rounded border p-2">
              <span className="text-xs text-muted-foreground block">{t("text.flanges")}</span>
              <span className="font-semibold">{flangeTotal}</span>
            </div>
            <div className={`rounded border p-2 ${ndePending > 0 ? "border-amber-400 bg-amber-50/50" : ""}`}>
              <span className="text-xs text-muted-foreground block">{t("text.ndePending")}</span>
              <span className="font-semibold">{ndePending}</span>
            </div>
            <div className={`rounded border p-2 ${pwhtPending > 0 ? "border-amber-400 bg-amber-50/50" : ""}`}>
              <span className="text-xs text-muted-foreground block">{t("text.pwhtPending")}</span>
              <span className="font-semibold">{pwhtPending}</span>
            </div>
            <div className={`rounded border p-2 ${linePending > 0 || xOpen > 0 ? "border-amber-400 bg-amber-50/50" : ""}`}>
              <span className="text-xs text-muted-foreground block">{t("text.lineCheckX")}</span>
              <span className="font-semibold">
                {linePending}  {t("text.line")} {xOpen} X
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resolution actions table */}
      {!isRft && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">{t("text.blockerResolution")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {linePending > 0 && (
              <div className="flex items-center justify-between p-2 rounded border text-sm">
                <span>{t("text.lineCheckPendingCount", { count: linePending })}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onNavigateWorkflow?.("line_check", "preparation")}
                >

                  {t("text.workflowLineCheck")}
                </Button>
              </div>
            )}

            {xOpen > 0 && (
              <div className="flex items-center justify-between p-2 rounded border text-sm">
                <span>{t("text.punchCount", { count: xOpen })}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onNavigateWorkflow?.("item_clearance", "preparation")}
                >

                  {t("text.workflowItemClearance")}
                </Button>
              </div>
            )}

            {ndePending > 0 && (
              <div className="flex items-center justify-between p-2 rounded border text-sm">
                <span>

                  {t("text.ndeCount", { count: ndePending })}
                  {selectedSpool && t("text.spool0", { v1: (selectedSpool.spool_number) ?? "—" })}
                </span>
                <Link
                  className="inline-flex items-center gap-1 text-xs underline font-medium"
                  href={safeLink("/nde", selectedSpool?.spool_revision_id)}
                >

                  {t("text.openNde")} <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            )}

            {pwhtPending > 0 && (
              <div className="flex items-center justify-between p-2 rounded border text-sm">
                <span>

                  {t("text.pwhtCount", { count: pwhtPending })}
                  {selectedSpool && t("text.spool0", { v1: (selectedSpool.spool_number) ?? "—" })}
                </span>
                <Link
                  className="inline-flex items-center gap-1 text-xs underline font-medium"
                  href={safeLink("/fabrication/qc-release", selectedSpool?.spool_revision_id)}
                >

                  {t("text.qcRelease")} <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            )}

            {can?.("erection.view") && (
              <div className="flex items-center justify-between p-2 rounded border text-sm">
                <span>{t("text.weldSupportErectionStatus")}</span>
                <Link
                  className="inline-flex items-center gap-1 text-xs underline font-medium"
                  href={safeLink("/erection", selectedSpool?.spool_revision_id)}
                >

                  {t("text.erectionWorkbench")} <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            )}

            {can?.("flange.view") && (
              <div className="flex items-center justify-between p-2 rounded border text-sm">
                <span>{t("text.flangeProgressInspection")}</span>
                <Link
                  className="inline-flex items-center gap-1 text-xs underline font-medium"
                  href={safeLink("/erection/flange-progress")}
                >

                  {t("text.flangeProgress")} <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            )}

            {memberCount === 0 && (
              <div className="flex items-center justify-between p-2 rounded border text-sm">
                <span>{t("text.missingEngineeringIsometricsComposition")}</span>
                <Link
                  className="inline-flex items-center gap-1 text-xs underline font-medium"
                  href={safeLink("/spooling/browse")}
                >

                  {t("text.spoolingBrowse")} <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ISO Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">{t("text.isometricBreakdown")}{isoStatus.length})</CardTitle>
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
                      {iso.is_rft ? t("text.readyForTest162") : t("text.ongoingBlocked260")}
                    </span>
                  </div>
                  <div>
                    {xCount > 0 && (
                      <span className="text-xs text-destructive font-medium mr-2">

                        {t("text.xOpen")} {xCount}
                      </span>
                    )}
                    <Badge variant={iso.is_rft ? "default" : "secondary"}>
                      {iso.is_rft ? "RFT" : t("text.blocked")}
                    </Badge>
                  </div>
                </div>
              )
            })}
            {isoStatus.length === 0 && (
              <p className="text-sm text-muted-foreground">{t("text.noIsometricsInThisPack")}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Spool Breakdown */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold">{t("text.spoolBreakdown")}{spools.length})</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">

              {t("text.clickASpoolToScopeResolutionLinksTo")}
            </p>
          </div>
          {selectedSpool && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onSelectSpool?.(null)}
            >

              {t("text.clearSpoolSelection")}
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
                    ? t("text.ongoing")
                    : t("text.unknown")
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

                      {t("text.ndePending267")} {spool.nde_pending ?? 0}  {t("text.pwhtPending268")}{" "}
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
              <p className="text-sm text-muted-foreground">{t("text.noSpoolsInCurrentProjection")}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
