import {
  accessibleHref,
  workspaceAreas,
  type NavItem,
  type WorkContextKey,
  type WorkspaceArea,
} from "@/config/navigation"
import type { Capability } from "@/modules/access/domain/capability"

type Can = (capability: Capability) => boolean

export interface VisibleArea extends WorkspaceArea {
  /** The pages of this area the user may open, in registry order. Never empty. */
  pages: NavItem[]
  /** Where the area opens: its first page the user may open. */
  home: string
}

/**
 * Areas the user can enter, each with only the pages it may open. A page reachable only through
 * one of its aliases opens there.
 */
export function getVisibleAreas(can: Can): VisibleArea[] {
  return workspaceAreas.flatMap((area) => {
    const pages = area.children.flatMap((page) => {
      if (page.planned) return []
      const href = accessibleHref(page, can)
      return href ? [href === page.href ? page : { ...page, href }] : []
    })
    return pages.length ? [{ ...area, pages, home: pages[0].href }] : []
  })
}

const isUnder = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(`${href}/`)

export interface Location {
  area: VisibleArea
  /** The registry page the path belongs to, or null for a route with no page of its own. */
  page: NavItem | null
}

/**
 * The area and page a path belongs to. The longest matching page wins, so `/testpack/explorer`
 * is Explorer rather than the Test Pack dashboard at `/testpack`, and pressure-test step routes
 * stay under Pressure Test.
 */
export function locate(pathname: string, areas: readonly VisibleArea[]): Location | null {
  let best: { area: VisibleArea; page: NavItem | null; length: number } | null = null
  for (const area of areas) {
    for (const page of area.pages) {
      // An alias renders this page's screen under another address; it is the same page.
      for (const href of [page.href, ...(page.aliases ?? []).map((alias) => alias.href)]) {
        if (isUnder(pathname, href) && (!best || href.length > best.length)) {
          best = { area, page, length: href.length }
        }
      }
    }
    if (isUnder(pathname, area.href) && (!best || area.href.length > best.length)) {
      best = { area, page: null, length: area.href.length }
    }
  }
  return best ? { area: best.area, page: best.page } : null
}

export interface WorkContext {
  /** Spool revision id. */
  spool: string | null
  /** Test pack id. */
  testPack: string | null
}

export const EMPTY_WORK_CONTEXT: WorkContext = { spool: null, testPack: null }

/** The query keys each context travels under. `testPackId` is what the Test Pack screens read. */
export const WORK_CONTEXT_PARAMS: Record<WorkContextKey, string> = {
  spool: "spool",
  testPack: "testPackId",
}

export function readWorkContext(params: URLSearchParams): WorkContext {
  return {
    spool: params.get(WORK_CONTEXT_PARAMS.spool) || null,
    testPack: params.get(WORK_CONTEXT_PARAMS.testPack) || null,
  }
}

/** A page link that carries the selected object, but only to a page that applies it. */
export function hrefWithContext(page: Pick<NavItem, "href" | "context">, context: WorkContext): string {
  const params = new URLSearchParams()
  for (const key of page.context ?? []) {
    const value = context[key]
    if (value) params.set(WORK_CONTEXT_PARAMS[key], value)
  }
  const query = params.toString()
  return query ? `${page.href}?${query}` : page.href
}

/** The page's home inside the area, carrying context when that page applies it. */
export function areaHrefWithContext(area: VisibleArea, context: WorkContext): string {
  const home = area.pages[0]
  return hrefWithContext(home, context)
}

/**
 * A return address handed to another page. Only a path inside this app is accepted: a `from`
 * that could point elsewhere would turn every "Back" button into an open redirect.
 */
export function safeReturnPath(value: string | null | undefined): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return null
  try {
    const url = new URL(value, "http://pipeqc.local")
    return url.origin === "http://pipeqc.local" ? `${url.pathname}${url.search}` : null
  } catch {
    return null
  }
}

/** A link to `href` that remembers where it was followed from. */
export function linkFrom(href: string, from: string): string {
  const [path, query = ""] = href.split("?")
  const params = new URLSearchParams(query)
  params.set("from", from)
  return `${path}?${params.toString()}`
}

/** The name of the page a return path leads to, for "Back to …". */
export function returnLabel(from: string, areas: readonly VisibleArea[]): string {
  const path = from.split("?")[0]
  if (path === "/") return "Overview"
  if (path === "/projects") return "Projects"
  const location = locate(path, areas)
  if (!location) return "previous page"
  if (!location.page || location.page.href === location.area.href) return location.area.title
  return location.area.pages.length > 1
    ? `${location.area.title} · ${location.page.title}`
    : location.page.title
}

export interface TabGroup {
  label: string | null
  pages: NavItem[]
}

/** Consecutive pages sharing a group, in registry order, for the module tab strip. */
export function groupTabs(pages: readonly NavItem[]): TabGroup[] {
  const groups: TabGroup[] = []
  for (const page of pages) {
    const label = page.group ?? null
    const last = groups.at(-1)
    if (last && last.label === label) last.pages.push(page)
    else groups.push({ label, pages: [page] })
  }
  return groups
}
