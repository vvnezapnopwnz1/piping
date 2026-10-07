"use client"

import { useTranslations } from "next-intl"
import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowLeft, ArrowRight, FlaskConical, MapPin, X } from "lucide-react"

import { useSupabaseAuth } from "@/contexts/supabase-auth-context"

import { useNavName } from "./nav-name"
import { withProject } from "./project-url"
import { useWorkContext } from "./work-context"
import {
  areaHrefWithContext,
  groupTabs,
  hrefWithContext,
  locate,
  returnLabel,
  type VisibleArea,
} from "./workspace-model"
import styles from "./workbench-shell.module.css"

function RailItem({
  area,
  href,
  current,
}: {
  area: VisibleArea
  href: string
  current: boolean
}) {
  const Icon = area.icon
  const name = useNavName()
  return (
    <Link
      href={href}
      className={styles.railItem}
      data-kind={area.kind}
      aria-current={current ? "page" : undefined}
    >
      <Icon aria-hidden="true" className={styles.railIcon} />
      <span className={styles.railText}>
        <span className={styles.railLabel}>{name(area.title)}</span>
      </span>
    </Link>
  )
}

/**
 * The compact state of the process map: the same areas, in the same order, as the overview's
 * map. It is not shown on the overview, where the map itself is the navigation.
 */
export function StageRail() {
  const t = useTranslations("shell.processNav")
  const work = useWorkContext()
  const pathname = usePathname()
  const code = useSupabaseAuth().access?.activityCode
  const ref = React.useRef<HTMLDivElement>(null)
  const areas = React.useMemo(() => work?.areas ?? [], [work?.areas])
  const current = locate(pathname, areas)?.area.id ?? null

  // Keep the current stage in view on narrow screens without moving the page itself.
  React.useEffect(() => {
    const track = ref.current
    const active = track?.querySelector<HTMLElement>('[aria-current="page"]')
    if (!track || !active) return
    const offset = active.offsetLeft - track.clientWidth / 2 + active.offsetWidth / 2
    track.scrollLeft = Math.max(0, offset)
  }, [current])

  if (!work || !areas.length) return null
  const kinds = ["stage", "service", "project"] as const

  return (
    <nav aria-label={t("stages")} className={styles.rail} data-help="stage-rail">
      <div ref={ref} className={styles.railTrack}>
        {kinds.map((kind, index) => {
          const group = areas.filter((area) => area.kind === kind)
          if (!group.length) return null
          return (
            <React.Fragment key={kind}>
              {index > 0 ? <span className={styles.railSep} aria-hidden="true" /> : null}
              <ul className={styles.railGroup} aria-label={t(kind === "stage" ? "groupStages" : kind === "service" ? "groupServices" : "groupProject")}>
                {group.map((area, position) => (
                  <li key={area.id} className={styles.railCell}>
                    {kind === "stage" && position > 0 ? (
                      <ArrowRight aria-hidden="true" className={styles.railArrow} />
                    ) : null}
                    <RailItem
                      area={area}
                      href={withProject(areaHrefWithContext(area, work.context), code)}
                      current={area.id === current}
                    />
                  </li>
                ))}
              </ul>
            </React.Fragment>
          )
        })}
      </div>
    </nav>
  )
}

function ContextChip({
  kind,
  label,
  onClear,
}: {
  kind: "spool" | "testPack"
  label: string | null
  onClear: () => void
}) {
  const Icon = kind === "spool" ? MapPin : FlaskConical
  const t = useTranslations("shell.processNav")
  const noun = t(kind === "spool" ? "spool" : "testPack")
  return (
    <span className={styles.chip} data-help="work-context">
      <Icon aria-hidden="true" />
      <span className={styles.chipNoun}>{noun}</span>
      <span className={styles.chipValue}>{label ?? t("selected")}</span>
      <button
        type="button"
        className={styles.chipClear}
        onClick={onClear}
        aria-label={t(kind === "spool" ? "clearSpool" : "clearTestPack", { label: label ?? "" }).trim()}
      >
        <X aria-hidden="true" />
      </button>
    </span>
  )
}

/**
 * The module's own strip: its pages as tabs, the object you carry, and the way back to where a
 * blocker sent you from. No breadcrumb: the identity bar names the project and the rail marks the
 * stage, and both are where you change them.
 */
export function ModuleHeader() {
  const t = useTranslations("shell.processNav")
  const name = useNavName()
  const work = useWorkContext()
  const pathname = usePathname()
  const code = useSupabaseAuth().access?.activityCode ?? null
  if (!work) return null
  const location = locate(pathname, work.areas)
  const area = location?.area ?? null
  const page = location?.page ?? null
  const tabs = area && area.pages.length > 1 ? groupTabs(area.pages) : []
  const { context, labels, from } = work
  // A page that shows the selected object itself (the spool drawer) does not repeat it as a chip.
  const spoolChip = Boolean(context.spool) && !page?.displaysContext
  const testPackChip = Boolean(context.testPack) && !page?.displaysContext
  const tools = spoolChip || testPackChip || Boolean(from)
  if (!tabs.length && !tools) return null

  return (
    <div className={styles.moduleHead}>
      <div className={styles.headRow}>
        {tabs.length ? (
          <nav aria-label={t("modulePages", { module: name(area!.title) })} className={styles.tabs} data-help="module-tabs">
            {tabs.map((group, index) => (
              <div key={`${group.label ?? "main"}-${index}`} className={styles.tabGroup}>
                {group.label ? <span className={styles.tabGroupLabel}>{name(group.label)}</span> : null}
                <ul>
                  {group.pages.map((tab) => {
                    const active = page?.href === tab.href
                    return (
                      <li key={tab.href}>
                        <Link
                          href={withProject(hrefWithContext(tab, context), code)}
                          className={styles.tab}
                          aria-current={active ? "page" : undefined}
                        >
                          {name(tab.title)}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </nav>
        ) : null}
        {tools ? (
          <div className={styles.headTools}>
            {spoolChip ? (
              <ContextChip kind="spool" label={labels.spool} onClear={() => work.clear("spool")} />
            ) : null}
            {testPackChip ? (
              <ContextChip kind="testPack" label={labels.testPack} onClear={() => work.clear("testPack")} />
            ) : null}
            {from ? (
              <Link href={from} className={styles.backLink}>
                <ArrowLeft aria-hidden="true" />
                {t("backTo", { page: returnLabel(from, work.areas, name) })}
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
