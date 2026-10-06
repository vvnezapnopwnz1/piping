import { getVisibleNavigation, type NavItem } from "@/config/navigation"
import { requiredCapabilityForPath } from "@/config/route-capabilities"
import type { Capability } from "@/modules/access/domain/capability"

type Can = (capability: Capability) => boolean
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
  ["line-check", "Line Check", ["preparation", "progress"]],
  ["item-clearance", "Item Clearance", ["preparation", "progress"]],
  ["blinding", "Blinding", ["preparation", "progress"]],
  ["testing-precomm", "Testing & Pre-commissioning", ["progress"]],
  ["reinstatement", "Reinstatement", ["preparation", "progress"]],
] as const

const TEST_PAGES: PageDestination[] = TEST_STEPS.flatMap(
  ([slug, title, tabs]) => {
    const href = `/testpack/pressure-test/${slug}`
    return [
      { title, href, section: "TESTING", context: "Testpack / Pressure Test" },
      ...tabs.map((tab) => ({
        title: tab === "preparation" ? "Preparation" : "Progress",
        href: `${href}/${tab}`,
        section: "TESTING",
        context: `Testpack / Pressure Test / ${title}`,
      })),
    ]
  },
)

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

export function getPageDestinations(can: Can): PageDestination[] {
  const pages: PageDestination[] = [
    {
      title: "Process overview",
      href: "/",
      section: "WORKSPACE",
      context: "Home",
    },
    {
      title: "All projects",
      href: "/projects",
      section: "WORKSPACE",
      context: "Choose a project",
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
        title: item.title,
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
          title: alias.title,
          href: alias.href,
          section,
          context: [...ancestors, item.title].join(" / "),
        })
      }
    }
    item.children?.forEach((child) =>
      visit(child, section, [...ancestors, item.title]),
    )
  }
  getVisibleNavigation(can).forEach((section) =>
    section.items.forEach((item) => visit(item, section.title, [])),
  )
  pages.push(...TEST_PAGES.filter((page) => canVisit(page.href, can)))
  return pages
}

export function getPageHierarchy(
  pathname: string,
  can: Can,
): PageDestination[] {
  const testPage = TEST_PAGES.find(
    (page) => page.href === pathname && canVisit(page.href, can),
  )
  if (testPage) {
    const parent = TEST_PAGES.find((page) =>
      testPage.href.startsWith(page.href + "/"),
    )
    return [
      ...getPageHierarchy("/testpack/pressure-test", can),
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
          title: item.title,
          href: item.href,
          section: section.title,
          context: "",
        }))
    }
  }
  // Do not turn UUIDs into breadcrumb links or invent nonexistent ancestor routes.
  const parent = getPageDestinations(can)
    .filter((page) => page.href !== "/" && pathname.startsWith(page.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0]
  return parent
    ? [
        parent,
        {
          title: "Record details",
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
): PageDestination[] {
  return [
    {
      title: "All projects",
      href: "/projects",
      section: "WORKSPACE",
      context: "",
    },
    { title: "Process overview", href: "/", section: "WORKSPACE", context: "" },
    ...(pathname === "/" ? [] : getPageHierarchy(pathname, can)),
  ]
}

const RELATED: Record<
  string,
  { title: string; href: string; purpose: string }[]
> = {
  spooling: [
    {
      title: "Fabrication",
      href: "/fabrication",
      purpose: "Work from imported spools",
    },
  ],
  fabrication: [
    { title: "NDE", href: "/nde", purpose: "Inspection obligations" },
    { title: "Tracking", href: "/tracking", purpose: "Locate spools" },
    { title: "Erection", href: "/erection", purpose: "Continue site work" },
  ],
  erection: [
    { title: "NDE", href: "/nde", purpose: "Inspection obligations" },
    { title: "Flanges", href: "/flange", purpose: "Joint completion" },
    {
      title: "Test packs",
      href: "/testpack",
      purpose: "Review test readiness",
    },
  ],
  nde: [
    { title: "Fabrication", href: "/fabrication", purpose: "Shop progress" },
    { title: "Erection", href: "/erection", purpose: "Site progress" },
  ],
  tracking: [
    { title: "Fabrication", href: "/fabrication", purpose: "Shop progress" },
    { title: "Erection", href: "/erection", purpose: "Site progress" },
  ],
  flange: [
    { title: "Erection", href: "/erection", purpose: "Site progress" },
    {
      title: "Test packs",
      href: "/testpack",
      purpose: "Review test readiness",
    },
  ],
  testpack: [
    {
      title: "Erection RFT",
      href: "/erection/rft",
      purpose: "Check spool readiness",
    },
    { title: "NDE", href: "/nde", purpose: "Review inspection work" },
  ],
}

export function getRelatedWork(pathname: string, can: Can) {
  return (RELATED[pathname.split("/")[1]] ?? []).filter((page) =>
    canVisit(page.href, can),
  )
}
