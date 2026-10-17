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
} from 'lucide-react'
import type { Messages } from '@/i18n/messages'
import type { Capability } from '@/modules/access/domain/capability'

import { requiredCapabilityForPath } from './route-capabilities'

/** A navigation title: a key of the `nav` messages. */
export type NavKey = keyof Messages['nav']

/**
 * The object a page can work on when one is handed to it in the address bar: `spool` is a spool
 * revision id, `testPack` a test pack id. Module tabs and the stage rail carry it only to pages
 * that declare they apply it, so a page never claims a filter it does not perform.
 */
export type WorkContextKey = 'spool' | 'testPack'

export interface NavItem {
  /** A key of the `nav` messages; screens show it through `useNavName()`. */
  title: NavKey
  href: string
  icon: LucideIcon
  children?: NavItem[]
  /** Local-tab group inside the module, e.g. "Spool stages". */
  group?: NavKey
  /** Object context this page applies; see `WorkContextKey`. */
  context?: readonly WorkContextKey[]
  /**
   * Other routes that render this same screen. They stay valid addresses and page-finder
   * destinations, but they are this page, not a second tab showing identical content.
   */
  aliases?: readonly { title: NavKey; href: string }[]
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
    title: 'spooling',
    href: '/spooling',
    icon: Box,
    children: [
      { title: 'browse', href: '/spooling/browse', icon: FolderTree },
      { title: 'spoolGenImport', href: '/spooling/import', icon: Inbox },
      { title: 'revisionHistory', href: '/spooling/revisions', icon: GitBranch },
    ],
  },
  {
    id: 'fabrication',
    kind: 'stage',
    step: '02',
    title: 'fabrication',
    href: '/fabrication',
    icon: Wrench,
    children: [
      {
        // One workbench for the spool's whole shop sequence (CONSTRUCTION_STAGES). Its stage
        // timeline is the navigation between operations, so they are not tabs of their own; each
        // operation keeps its address and opens the workbench on that operation.
        title: 'spools',
        href: '/fabrication',
        icon: Box,
        context: SPOOL,
        displaysContext: true,
        aliases: [
          { title: 'materialCheck', href: '/fabrication/material-check' },
          { title: 'shopWeldProgress', href: '/fabrication/weld-progress' },
          { title: 'qcRelease', href: '/fabrication/qc-release' },
          { title: 'pwhtRelease', href: '/fabrication/pwht-release' },
          { title: 'paint', href: '/fabrication/paint' },
          { title: 'laydown', href: '/fabrication/laydown' },
        ],
      },
      { title: 'dashboard', href: '/fabrication/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    id: 'erection',
    kind: 'stage',
    step: '03',
    title: 'erection',
    href: '/erection',
    icon: HardHat,
    children: [
      {
        // One workbench for a field spool's sequence: To Site → field material → Erected →
        // Welded / Bolted → Supported → Ready for Test. Each operation keeps its address.
        title: 'spools',
        href: '/erection',
        icon: MapPin,
        context: SPOOL,
        displaysContext: true,
        aliases: [
          { title: 'toSite', href: '/erection/to-site' },
          { title: 'fieldMaterialCheck', href: '/erection/material-check' },
          { title: 'erected', href: '/erection/erected' },
          { title: 'weldedBolted', href: '/erection/welded-bolted' },
          { title: 'siteWeldProgress', href: '/erection/weld-progress' },
          { title: 'supported', href: '/erection/supported' },
          { title: 'readyForTest', href: '/erection/rft' },
          { title: 'fieldQcRelease', href: '/erection/field-qc-release' },
        ],
      },
      { title: 'dashboard', href: '/erection/dashboard', icon: LayoutDashboard, context: SPOOL },
      { title: 'flangeProgress', href: '/erection/flange-progress', icon: Bolt },
    ],
  },
  {
    id: 'testpacks',
    kind: 'stage',
    step: '04',
    title: 'testPacks',
    href: '/testpack',
    icon: FlaskConical,
    children: [
      {
        // One screen: the pack list and the selected pack's step timeline. The old pages keep their addresses
        // and open it (legacy-address.ts); they are this page, not tabs of their own.
        title: 'testPacks',
        href: '/testpack',
        icon: FlaskConical,
        context: TEST_PACK,
        aliases: [
          { title: 'builder', href: '/testpack/builder' },
          { title: 'explorer', href: '/testpack/explorer' },
          { title: 'pressureTest', href: '/testpack/pressure-test' },
        ],
      },
    ],
  },
  {
    id: 'nde',
    kind: 'service',
    title: 'nde',
    href: '/nde',
    icon: Scan,
    serves: ['fabrication', 'erection'],
    children: [
      { title: 'batchManagement', href: '/nde', icon: Scan, context: SPOOL },
      { title: 'dashboard', href: '/nde/dashboard', icon: Activity },
    ],
  },
  {
    id: 'tracking',
    kind: 'service',
    title: 'tracking',
    href: '/tracking',
    icon: MapPin,
    serves: ['fabrication', 'erection'],
    children: [
      { title: 'dashboard', href: '/tracking', icon: LayoutDashboard },
      { title: 'dataAnalysis', href: '/tracking/data-analysis', icon: Activity },
      { title: 'barcodePrinting', href: '/tracking/print-barcodes', icon: Scan },
      { title: 'mobileDeviceManagement', href: '/tracking/devices', icon: Gauge },
    ],
  },
  {
    id: 'flange',
    kind: 'service',
    title: 'flanges',
    href: '/flange',
    icon: CircleDot,
    serves: ['erection', 'testpacks'],
    children: [{ title: 'flangeManagement', href: '/flange', icon: CircleDot }],
  },
  {
    id: 'setup',
    kind: 'project',
    title: 'projectSetup',
    href: '/admin',
    icon: Shield,
    children: [
      { title: 'setupHome', href: '/admin', icon: LayoutDashboard },
      { title: 'projectDefinition', href: '/admin/project-definition', icon: FileCog },
      { title: 'systemReferential', href: '/admin/system-referential', icon: Database },
      { title: 'projectReferential', href: '/admin/project-referential', icon: FolderCog },
      { title: 'accessRights', href: '/admin/access-rights', icon: KeyRound },
      { title: 'imports', href: '/admin/imports', icon: Inbox },
      { title: 'progressWeights', href: '/admin/progress-weights', icon: FileCog },
    ],
  },
  {
    id: 'reports',
    kind: 'project',
    title: 'reports',
    href: '/reports',
    icon: FileText,
    children: [{ title: 'reports', href: '/reports', icon: FileText }],
  },
]

export interface NavSection {
  title: NavKey
  items: NavItem[]
}

const SECTION_TITLES: Record<WorkspaceAreaKind, NavKey> = {
  stage: 'sectionProcess',
  service: 'sectionSharedServices',
  project: 'sectionProject',
}

export const navigationConfig: NavSection[] = [
  ...(['stage', 'service', 'project'] as const).map((kind) => ({
    title: SECTION_TITLES[kind],
    items: workspaceAreas.filter((area) => area.kind === kind),
  })),
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
