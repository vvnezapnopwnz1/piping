"use client"

import Link from "next/link"
import { AlertTriangle, ArrowRight, Check } from "lucide-react"

import { Button } from "@/components/ui/button"
import { canVisit } from "@/components/pipeqc/navigation-model"
import { withProject } from "@/components/pipeqc/project-url"
import { linkFrom } from "@/components/pipeqc/workspace-model"
import { useSupabaseAuth } from "@/contexts/supabase-auth-context"
import type { Capability } from "@/modules/access/domain/capability"
import { listRftShortfall } from "../../application/describe-erection-readiness"
import type { ErectionReadiness } from "../../infrastructure/supabase-erection-repository"
import styles from "../spool-workbench.module.css"
import { useErectionOperationNavigation } from "./erection-screen-shell"
import { useErectionReadiness } from "./use-erection-readiness"

type Can = (capability: Capability) => boolean

export function ErectionRftPanel({
  row,
  here,
  can,
}: {
  row: ErectionReadiness
  here: string
  can: Can | undefined
}) {
  const nav = useErectionOperationNavigation()
  const { refresh } = useErectionReadiness()
  const activityCode = useSupabaseAuth().access?.activityCode
  const shortfall = listRftShortfall(row)

  const ndeHref =
    can && canVisit("/nde", can)
      ? linkFrom(withProject(`/nde?spool=${encodeURIComponent(row.spoolRevisionId)}`, activityCode), here)
      : null
  const pwhtHref =
    can && canVisit("/fabrication/qc-release", can)
      ? linkFrom(
          withProject(`/fabrication/qc-release?spool=${encodeURIComponent(row.spoolRevisionId)}`, activityCode),
          here,
        )
      : null

  const canOpenWelded = nav ? nav.canOpenOperation("welded") : can ? canVisit("/erection/welded-bolted", can) : false
  const canOpenSupported = nav ? nav.canOpenOperation("supported") : can ? canVisit("/erection/supported", can) : false

  const weldedStandaloneHref =
    !nav && canOpenWelded
      ? linkFrom(
          withProject(`/erection/welded-bolted?spool=${encodeURIComponent(row.spoolRevisionId)}`, activityCode),
          here,
        )
      : null

  const supportedStandaloneHref =
    !nav && canOpenSupported
      ? linkFrom(
          withProject(`/erection/supported?spool=${encodeURIComponent(row.spoolRevisionId)}`, activityCode),
          here,
        )
      : null

  const criteria = [
    {
      name: "Welded / Bolted",
      met: Boolean(row.weldedBoltedOn),
      detail: row.weldedBoltedOn ? `Recorded ${row.weldedBoltedOn.slice(0, 10)}` : "Not recorded",
      action: !row.weldedBoltedOn ? (
        nav && canOpenWelded ? (
          <button
            type="button"
            onClick={() => nav.openOperation("welded")}
            className={styles.factLink}
            data-help="rft-blocker"
          >
            Resolve <ArrowRight aria-hidden="true" />
          </button>
        ) : weldedStandaloneHref ? (
          <Link href={weldedStandaloneHref} className={styles.factLink} data-help="rft-blocker">
            Resolve <ArrowRight aria-hidden="true" />
          </Link>
        ) : (
          <span className={styles.criterionDetail}>Not in your access</span>
        )
      ) : null,
    },
    {
      name: "Supported",
      met: Boolean(row.supportedOn),
      detail: row.supportedOn ? `Recorded ${row.supportedOn.slice(0, 10)}` : "Not recorded",
      action: !row.supportedOn ? (
        nav && canOpenSupported ? (
          <button
            type="button"
            onClick={() => nav.openOperation("supported")}
            className={styles.factLink}
            data-help="rft-blocker"
          >
            Resolve <ArrowRight aria-hidden="true" />
          </button>
        ) : supportedStandaloneHref ? (
          <Link href={supportedStandaloneHref} className={styles.factLink} data-help="rft-blocker">
            Resolve <ArrowRight aria-hidden="true" />
          </Link>
        ) : (
          <span className={styles.criterionDetail}>Not in your access</span>
        )
      ) : null,
    },
    {
      name: "NDE obligations",
      met: row.ndePending === 0,
      detail: row.ndePending === 0 ? "None open" : `${row.ndePending} open`,
      action:
        row.ndePending > 0 ? (
          ndeHref ? (
            <Link href={ndeHref} className={styles.factLink} data-help="rft-blocker">
              Manage in NDE <ArrowRight aria-hidden="true" />
            </Link>
          ) : (
            <span className={styles.criterionDetail}>Not in your access</span>
          )
        ) : null,
    },
    {
      name: "PWHT",
      met: row.pwhtPending === 0,
      detail:
        row.pwhtPending === 0
          ? "None pending"
          : `${row.pwhtPending} pending · results are entered on QC Release`,
      action:
        row.pwhtPending > 0 ? (
          pwhtHref ? (
            <Link href={pwhtHref} className={styles.factLink} data-help="rft-blocker">
              Open QC release <ArrowRight aria-hidden="true" />
            </Link>
          ) : (
            <span className={styles.criterionDetail}>Not in your access</span>
          )
        ) : null,
    },
  ]

  return (
    <div className="space-y-4">
      <ul className={styles.criteria}>
        {criteria.map((criterion) => (
          <li key={criterion.name} data-met={criterion.met ? "" : undefined}>
            {criterion.met ? <Check aria-label="met" /> : <AlertTriangle aria-label="open" />}
            <span>
              <span className={styles.criterionName}>{criterion.name}</span>
              <br />
              <span className={styles.criterionDetail}>{criterion.detail}</span>
            </span>
            {criterion.action}
          </li>
        ))}
      </ul>
      <p className={styles.verdict} data-ready={row.isRft ? "" : undefined}>
        {row.isRft ? (
          `Ready for Test${row.rftOn ? ` since ${row.rftOn.slice(0, 10)}` : ""}. Derived from the criteria above, never set by hand.`
        ) : shortfall.length === 0 ? (
          <span className="flex items-center justify-between gap-2">
            <span>RFT is closed but no outstanding evidence is reported; reload the page.</span>
            <Button variant="outline" size="sm" onClick={() => void refresh()}>
              Retry refresh
            </Button>
          </span>
        ) : (
          "Not Ready for Test while any criterion above is open."
        )}
      </p>
    </div>
  )
}
