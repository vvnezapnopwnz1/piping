import { getVisibleNavigation, type NavItem, type NavKey } from "@/config/navigation"
import { requiredCapabilityForPath } from "@/config/route-capabilities"
import type { Capability } from "@/modules/access/domain/capability"

type Can = (capability: Capability) => boolean
/** The words for a navigation key in the current language (`useNavName()`). */
export type NavName = (key: NavKey) => string
export interface PageDestination {
  title: string
  href: string
  section: string
  context: string
}

export function scorePageQuery(value: string, query: string): number {
  const normalize = (text: string) =>
    text
      .toLowerCase()
      .replace(/[-_/]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  const text = normalize(value)
  const search = normalize(query)
  if (!search) return 1
  if (!search.split(" ").every((word) => text.includes(word))) return 0
  return text.startsWith(search) ? 1 : text.includes(search) ? 0.8 : 0.6
}

// Existing pressure-test screens use local tabs, not additional sidebar nesting.
const TEST_STEPS = [
  ["line-check", "lineCheck", ["preparation", "progress"]],
  ["item-clearance", "itemClearance", ["preparation", "progress"]],
  ["blinding", "blinding", ["preparation", "progress"]],
  ["testing-precomm", "testingPrecomm", ["progress"]],
  ["reinstatement", "reinstatement", ["preparation", "progress"]],
] as const

function testPages(name: NavName): PageDestination[] {
  const parent = `${name("testpack")} / ${name("pressureTest")}`
  return TEST_STEPS.flatMap(([slug, key, tabs]) => {
    const href = `/testpack/pressure-test/${slug}`
    return [
      { title: name(key), href, section: name("sectionTesting"), context: parent },
      ...tabs.map((tab) => ({
        title: name(tab),
        href: `${href}/${tab}`,
        section: name("sectionTesting"),
        context: `${parent} / ${name(key)}`,
      })),
    ]
  })
}

export function canVisit(href: string, can: Can): boolean {
  const capability = requiredCapabilityForPath(href)
  return !capability || can(capability)
}

export function firstAccessibleDestination(
  item: NavItem,
  can: Can,
): string | null {
  if (item.planned) return null
  if (canVisit(item.href, can)) return item.href
  for (const child of item.children ?? []) {
    const destination = firstAccessibleDestination(child, can)
    if (destination) return destination
  }
  return null
}

export function getPageDestinations(can: Can, name: NavName): PageDestination[] {
  const pages: PageDestination[] = [
    {
      title: name("processOverview"),
      href: "/",
      section: name("sectionWorkspace"),
      context: name("home"),
    },
    {
      title: name("allProjects"),
      href: "/projects",
      section: name("sectionWorkspace"),
      context: name("chooseProject"),
    },
  ]
  const seen = new Set(["/", "/projects"])
  function visit(item: NavItem, section: string, ancestors: string[]) {
    // A module opens on its first page the user may open, not on a redirecting index route.
    const href =
      !ancestors.length && item.children?.length
        ? firstAccessibleDestination(item, can)
        : canVisit(item.href, can)
          ? item.href
          : null
    if (href && !seen.has(href)) {
      seen.add(href)
      pages.push({
        title: name(item.title),
        href,
        section,
        context: ancestors.join(" / "),
      })
    }
    // Other addresses of the same screen stay findable under the name people search for.
    for (const alias of item.aliases ?? []) {
      if (canVisit(alias.href, can) && !seen.has(alias.href)) {
        seen.add(alias.href)
        pages.push({
          title: name(alias.title),
          href: alias.href,
          section,
          context: [...ancestors, name(item.title)].join(" / "),
        })
      }
    }
    item.children?.forEach((child) =>
      visit(child, section, [...ancestors, name(item.title)]),
    )
  }
  getVisibleNavigation(can).forEach((section) =>
    section.items.forEach((item) => visit(item, name(section.title), [])),
  )
  pages.push(...testPages(name).filter((page) => canVisit(page.href, can)))
  return pages
}

export function getPageHierarchy(
  pathname: string,
  can: Can,
  name: NavName,
): PageDestination[] {
  const tests = testPages(name)
  const testPage = tests.find(
    (page) => page.href === pathname && canVisit(page.href, can),
  )
  if (testPage) {
    const parent = tests.find((page) =>
      testPage.href.startsWith(page.href + "/"),
    )
    return [
      ...getPageHierarchy("/testpack/pressure-test", can, name),
      ...(parent ? [parent] : []),
      testPage,
    ]
  }
  function find(items: NavItem[], ancestors: NavItem[]): NavItem[] | null {
    for (const item of items) {
      // Descendants first: their hierarchy can differ from URL segments.
      const nested = item.children && find(item.children, [...ancestors, item])
      if (nested) return nested
      if (item.href === pathname) return [...ancestors, item]
      // An alias is the same screen under its own name: the page, then that name.
      const alias = item.aliases?.find((candidate) => candidate.href === pathname)
      if (alias) return [...ancestors, item, { ...item, title: alias.title, href: alias.href }]
    }
    return null
  }
  const sections = getVisibleNavigation(can)
  for (const section of sections) {
    const branch = find(section.items, [])
    if (branch) {
      const seen = new Set<string>()
      return branch
        .filter((item) => {
          if (seen.has(item.href)) return false
          seen.add(item.href)
          return true
        })
        .map((item) => ({
          title: name(item.title),
          href: item.href,
          section: name(section.title),
          context: "",
        }))
    }
  }
  // Do not turn UUIDs into breadcrumb links or invent nonexistent ancestor routes.
  const parent = getPageDestinations(can, name)
    .filter((page) => page.href !== "/" && pathname.startsWith(page.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0]
  return parent
    ? [
        parent,
        {
          title: name("recordDetails"),
          href: pathname,
          section: parent.section,
          context: "",
        },
      ]
    : []
}

export function getWorkbenchHierarchy(
  pathname: string,
  can: Can,
  name: NavName,
): PageDestination[] {
  return [
    {
      title: name("allProjects"),
      href: "/projects",
      section: name("sectionWorkspace"),
      context: "",
    },
    { title: name("processOverview"), href: "/", section: name("sectionWorkspace"), context: "" },
    ...(pathname === "/" ? [] : getPageHierarchy(pathname, can, name)),
  ]
}

const RELATED: Record<
  string,
  { title: NavKey; href: string; purpose: NavKey }[]
> = {
  spooling: [
    {
      title: "fabrication",
      href: "/fabrication",
      purpose: "purposeWorkFromImportedSpools",
    },
  ],
  fabrication: [
    { title: "nde", href: "/nde", purpose: "purposeInspectionObligations" },
    { title: "tracking", href: "/tracking", purpose: "purposeLocateSpools" },
    { title: "erection", href: "/erection", purpose: "purposeContinueSiteWork" },
  ],
  erection: [
    { title: "nde", href: "/nde", purpose: "purposeInspectionObligations" },
    { title: "flanges", href: "/flange", purpose: "purposeJointCompletion" },
    {
      title: "relatedTestPacks",
      href: "/testpack",
      purpose: "purposeReviewTestReadiness",
    },
  ],
  nde: [
    { title: "fabrication", href: "/fabrication", purpose: "purposeShopProgress" },
    { title: "erection", href: "/erection", purpose: "purposeSiteProgress" },
  ],
  tracking: [
    { title: "fabrication", href: "/fabrication", purpose: "purposeShopProgress" },
    { title: "erection", href: "/erection", purpose: "purposeSiteProgress" },
  ],
  flange: [
    { title: "erection", href: "/erection", purpose: "purposeSiteProgress" },
    {
      title: "relatedTestPacks",
      href: "/testpack",
      purpose: "purposeReviewTestReadiness",
    },
  ],
  testpack: [
    {
      title: "erectionRft",
      href: "/erection/rft",
      purpose: "purposeCheckSpoolReadiness",
    },
    { title: "nde", href: "/nde", purpose: "purposeReviewInspectionWork" },
  ],
}

export function getRelatedWork(pathname: string, can: Can, name: NavName) {
  return (RELATED[pathname.split("/")[1]] ?? [])
    .filter((page) => canVisit(page.href, can))
    .map((page) => ({ title: name(page.title), href: page.href, purpose: name(page.purpose) }))
}
