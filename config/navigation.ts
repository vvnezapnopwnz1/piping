import {
  Shield,
  Database,
  FileCog,
  FolderCog,
  KeyRound,
  Box,
  Wrench,
  MapPin,
  Scan,
  FileText,
  Settings,
  LayoutDashboard,
  Activity,
  type LucideIcon,
  HardHat,
  CircleDot,
  Gauge,
  FolderTree,
  FlaskConical,
  Bolt,
  Inbox,
  GitBranch,
  Send,
  ListPlus,
} from 'lucide-react'
import type { Capability } from '@/modules/access/domain/capability'

import { requiredCapabilityForPath } from './route-capabilities'

/**
 * The object a page can work on when one is handed to it in the address bar: `spool` is a spool
 * revision id, `testPack` a test pack id. Module tabs and the stage rail carry it only to pages
 * that declare they apply it, so a page never claims a filter it does not perform.
 */
export type WorkContextKey = 'spool' | 'testPack'

export interface NavItem {
  title: string
  href: string
  icon: LucideIcon
  children?: NavItem[]
  /**
   * The track that will build this module. Set means the route renders `NotOnSupabaseYet`, so
   * navigation leaves it out: an entry that leads only to "not built" is a dead end. The route
   * itself stays reachable by URL.
   */
  planned?: string
  /** Local-tab group inside the module, e.g. "Spool stages". */
  group?: string
  /** Object context this page applies; see `WorkContextKey`. */
  context?: readonly WorkContextKey[]
  /**
   * Other routes that render this same screen. They stay valid addresses and page-finder
   * destinations, but they are this page, not a second tab showing identical content.
   */
  aliases?: readonly { title: string; href: string }[]
  /** The page shows the selected object itself, so the shell does not repeat it as a chip. */
  displaysContext?: boolean
}

/**
 * `stage` — a step of the process, drawn left to right. `service` — shared by several stages
 * (NDE inspects shop and field welds), so it is drawn beside the stages, never between them.
 * `project` — rules and outputs of the project as a whole.
 */
export type WorkspaceAreaKind = 'stage' | 'service' | 'project'

export interface WorkspaceArea extends NavItem {
  id: string
  kind: WorkspaceAreaKind
  /** Position in the process, for stages only. */
  step?: string
  /** Stage ids a shared service works for. */
  serves?: readonly string[]
  children: NavItem[]
}

const SPOOL = ['spool'] as const
const TEST_PACK = ['testPack'] as const

/**
 * The one registry behind the overview map, the stage rail, module tabs, breadcrumbs and the
 * page finder. A module has one id, one name and one set of pages everywhere it appears.
 */
export const workspaceAreas: readonly WorkspaceArea[] = [
  {
    id: 'spooling',
    kind: 'stage',
    step: '01',
    title: 'Spooling',
    href: '/spooling',
    icon: Box,
    children: [
      { title: 'Browse', href: '/spooling/browse', icon: FolderTree },
      { title: 'SpoolGen Import', href: '/spooling/import', icon: Inbox },
      { title: 'Revision History', href: '/spooling/revisions', icon: GitBranch },
      {
        title: 'Engineering Transmittals',
        href: '/spooling/engineering-transmittals',
        planned: 'Track 04',
        icon: Inbox,
      },
      { title: 'ISO Workflow', href: '/spooling/iso-workflow', planned: 'Track 04', icon: GitBranch },
      {
        title: 'Spooling Transmittal',
        href: '/spooling/spooling-transmittal',
        planned: 'Track 04',
        icon: Send,
      },
    ],
  },
  {
    id: 'fabrication',
    kind: 'stage',
    step: '02',
    title: 'Fabrication',
    href: '/fabrication',
    icon: Wrench,
    children: [
      {
        // One workbench for the spool's whole shop sequence (CONSTRUCTION_STAGES). Its stage
        // timeline is the navigation between operations, so they are not tabs of their own; each
        // operation keeps its address and opens the workbench on that operation.
        title: 'Spools',
        href: '/fabrication',
        icon: Box,
        context: SPOOL,
        displaysContext: true,
        aliases: [
          { title: 'Material Check', href: '/fabrication/material-check' },
          { title: 'Shop Weld Progress', href: '/fabrication/weld-progress' },
          { title: 'QC Release', href: '/fabrication/qc-release' },
          { title: 'PWHT Release', href: '/fabrication/pwht-release' },
          { title: 'Paint', href: '/fabrication/paint' },
          { title: 'Laydown', href: '/fabrication/laydown' },
        ],
      },
      { title: 'Dashboard', href: '/fabrication/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    id: 'erection',
    kind: 'stage',
    step: '03',
    title: 'Erection',
    href: '/erection',
    icon: HardHat,
    children: [
      {
        // One workbench for a field spool's sequence: To Site → field material → Erected →
        // Welded / Bolted → Supported → Ready for Test. Each operation keeps its address.
        title: 'Spools',
        href: '/erection',
        icon: MapPin,
        context: SPOOL,
        displaysContext: true,
        aliases: [
          { title: 'To Site', href: '/erection/to-site' },
          { title: 'Field Material Check', href: '/erection/material-check' },
          { title: 'Erected', href: '/erection/erected' },
          { title: 'Welded / Bolted', href: '/erection/welded-bolted' },
          { title: 'Site Weld Progress', href: '/erection/weld-progress' },
          { title: 'Supported', href: '/erection/supported' },
          { title: 'Ready for Test', href: '/erection/rft' },
          { title: 'Field QC Release', href: '/erection/field-qc-release' },
        ],
      },
      { title: 'Dashboard', href: '/erection/dashboard', icon: LayoutDashboard, context: SPOOL },
      { title: 'Flange Progress', href: '/erection/flange-progress', icon: Bolt },
    ],
  },
  {
    id: 'testpacks',
    kind: 'stage',
    step: '04',
    title: 'Test Packs',
    href: '/testpack',
    icon: FlaskConical,
    children: [
      { title: 'Dashboard', href: '/testpack', icon: LayoutDashboard },
      { title: 'Builder', href: '/testpack/builder', icon: ListPlus, context: TEST_PACK },
      { title: 'Explorer', href: '/testpack/explorer', icon: FolderTree, context: TEST_PACK },
      { title: 'Pressure Test', href: '/testpack/pressure-test', icon: Gauge, context: TEST_PACK },
    ],
  },
  {
    id: 'nde',
    kind: 'service',
    title: 'NDE',
    href: '/nde',
    icon: Scan,
    serves: ['fabrication', 'erection'],
    children: [
      { title: 'Batch Management', href: '/nde', icon: Scan, context: SPOOL },
      { title: 'Dashboard', href: '/nde/dashboard', icon: Activity },
    ],
  },
  {
    id: 'tracking',
    kind: 'service',
    title: 'Tracking',
    href: '/tracking',
    icon: MapPin,
    serves: ['fabrication', 'erection'],
    children: [
      { title: 'Dashboard', href: '/tracking', icon: LayoutDashboard },
      { title: 'Data Analysis', href: '/tracking/data-analysis', icon: Activity },
      { title: 'Barcode Printing', href: '/tracking/print-barcodes', icon: Scan },
      { title: 'Mobile Device Management', href: '/tracking/devices', icon: Gauge },
    ],
  },
  {
    id: 'flange',
    kind: 'service',
    title: 'Flanges',
    href: '/flange',
    icon: CircleDot,
    serves: ['erection', 'testpacks'],
    children: [{ title: 'Flange Management', href: '/flange', icon: CircleDot }],
  },
  {
    id: 'setup',
    kind: 'project',
    title: 'Project Setup',
    href: '/admin',
    icon: Shield,
    children: [
      { title: 'Setup Home', href: '/admin', icon: LayoutDashboard },
      { title: 'Project Definition', href: '/admin/project-definition', icon: FileCog },
      { title: 'System Referential', href: '/admin/system-referential', icon: Database },
      { title: 'Project Referential', href: '/admin/project-referential', icon: FolderCog },
      { title: 'Access Rights', href: '/admin/access-rights', icon: KeyRound },
      { title: 'Imports', href: '/admin/imports', icon: Inbox },
      { title: 'Progress Weights', href: '/admin/progress-weights', icon: FileCog },
    ],
  },
  {
    id: 'reports',
    kind: 'project',
    title: 'Reports',
    href: '/reports',
    icon: FileText,
    children: [{ title: 'Reports', href: '/reports', icon: FileText }],
  },
]

export interface NavSection {
  title: string
  items: NavItem[]
}

const SECTION_TITLES: Record<WorkspaceAreaKind, string> = {
  stage: 'PROCESS',
  service: 'SHARED SERVICES',
  project: 'PROJECT',
}

/** Settings is the user's configuration, not a part of the project process. */
const CONFIGURATION: NavSection = {
  title: 'CONFIGURATION',
  items: [{ title: 'Settings', href: '/settings', icon: Settings }],
}

export const navigationConfig: NavSection[] = [
  ...(['stage', 'service', 'project'] as const).map((kind) => ({
    title: SECTION_TITLES[kind],
    items: workspaceAreas.filter((area) => area.kind === kind),
  })),
  CONFIGURATION,
]

/**
 * The address a user opens a page at: its own route, or else the first alias route their access
 * allows — a QC inspector without fabrication.view still reaches the workbench on QC Release.
 */
export function accessibleHref(
  item: NavItem,
  can: (capability: Capability) => boolean,
): string | null {
  for (const href of [item.href, ...(item.aliases ?? []).map((alias) => alias.href)]) {
    const capability = requiredCapabilityForPath(href)
    if (!capability || can(capability)) return href
  }
  return null
}

function getVisibleItem(
  item: NavItem,
  can: (capability: Capability) => boolean,
): NavItem | null {
  // A route whose module is not built has nothing to navigate to.
  if (item.planned) return null

  const children = item.children
    ?.map((child) => getVisibleItem(child, can))
    .filter((child): child is NavItem => child !== null)
  const href = accessibleHref(item, can)

  if (href || children?.length) {
    return {
      ...item,
      ...(href && href !== item.href ? { href } : {}),
      ...(children ? { children } : {}),
    }
  }

  return null
}

export function getVisibleNavigation(
  can: (capability: Capability) => boolean,
): NavSection[] {
  return navigationConfig
    .map((section) => ({
      ...section,
      items: section.items
        .map((item) => getVisibleItem(item, can))
        .filter((item): item is NavItem => item !== null),
    }))
    .filter((section) => section.items.length > 0)
}
