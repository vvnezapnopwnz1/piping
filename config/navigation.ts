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
  BookOpen,
  LayoutDashboard,
  Activity,
  type LucideIcon,
  HardHat,
  CircleDot,
  Gauge,
  FolderTree,
  FlaskConical,
  ClipboardCheck,
  ShieldCheck,
  Paintbrush,
  Warehouse,
  Truck,
  Anchor,
  Combine,
  CheckCircle2,
  Bolt,
  Flame,
  Inbox,
  GitBranch,
  Send,
  ListPlus,
} from 'lucide-react'
import type { Capability } from '@/modules/access/domain/capability'

import { requiredCapabilityForPath } from './route-capabilities'

export interface NavItem {
  title: string
  href: string
  icon: LucideIcon
  children?: NavItem[]
}

export interface NavSection {
  title: string
  items: NavItem[]
}

export const navigationConfig: NavSection[] = [
  {
    title: 'SETUP',
    items: [
      {
        title: 'Admin Module',
        href: '/admin',
        icon: Shield,
        children: [
          {
            title: 'Home',
            href: '/admin',
            icon: LayoutDashboard,
          },
          {
            title: 'Project Definition',
            href: '/admin/project-definition',
            icon: FileCog,
          },
          {
            title: 'System Referential',
            href: '/admin/system-referential',
            icon: Database,
          },
          {
            title: 'Project Referential',
            href: '/admin/project-referential',
            icon: FolderCog,
          },
          {
            title: 'Access Rights',
            href: '/admin/access-rights',
            icon: KeyRound,
          },
          {
            title: 'Import Settings',
            href: '/admin/import-settings',
            icon: Inbox,
          },
        ],
      },
    ],
  },
  {
    title: 'PREPARATION',
    items: [
      {
        title: 'Spooling',
        href: '/spooling',
        icon: Box,
        children: [
          {
            title: 'Home',
            href: '/spooling',
            icon: LayoutDashboard,
          },
          {
            title: 'Engineering Transmittals',
            href: '/spooling/engineering-transmittals',
            icon: Inbox,
          },
          {
            title: 'ISO Workflow',
            href: '/spooling/iso-workflow',
            icon: GitBranch,
          },
          {
            title: 'Spooling Transmittal',
            href: '/spooling/spooling-transmittal',
            icon: Send,
          },
        ],
      },
    ],
  },
  {
    title: 'CONSTRUCTION',
    items: [
      {
        title: 'Fabrication',
        href: '/fabrication',
        icon: Wrench,
        children: [
          {
            title: 'Dashboard',
            href: '/fabrication/dashboard',
            icon: LayoutDashboard,
          },
          {
            title: 'Spool Fabrication',
            href: '/fabrication/spool-fabrication',
            icon: Box,
            children: [
              {
                title: 'Material Check',
                href: '/fabrication/material-check',
                icon: ClipboardCheck,
              },
              {
                title: 'QC Release',
                href: '/fabrication/qc-release',
                icon: ShieldCheck,
              },
              {
                title: 'PWHT Release',
                href: '/fabrication/pwht-release',
                icon: Flame,
              },
              {
                title: 'Paint',
                href: '/fabrication/paint',
                icon: Paintbrush,
              },
              {
                title: 'Laydown',
                href: '/fabrication/laydown',
                icon: Warehouse,
              },
            ],
          },
          {
            title: 'Shop Weld Progress',
            href: '/fabrication/weld-progress',
            icon: Activity,
          },
        ],
      }, {
        title: 'Erection',
        href: '/erection',
        icon: HardHat, // или Construction из lucide
        children: [
          {
            title: 'Dashboard',
            href: '/erection/dashboard',
            icon: LayoutDashboard,
          },
          {
            title: 'Spool Erection',
            href: '/erection/spool-erection',
            icon: MapPin,
            children: [
              {
                title: 'To Site',
                href: '/erection/to-site',
                icon: Truck,
              },
              {
                title: 'Field Material Check',
                href: '/erection/material-check',
                icon: ClipboardCheck,
              },
              {
                title: 'Erected',
                href: '/erection/erected',
                icon: MapPin,
              },
              {
                title: 'Welded / Bolted',
                href: '/erection/welded-bolted',
                icon: Combine,
              },
              {
                title: 'Supported',
                href: '/erection/supported',
                icon: Anchor,
              },
              {
                title: 'Field QC Release',
                href: '/erection/field-qc-release',
                icon: ClipboardCheck,
              },
              {
                title: 'RFT',
                href: '/erection/rft',
                icon: CheckCircle2,
              },
            ],
          },
          {
            title: 'Site Weld Progress',
            href: '/erection/weld-progress',
            icon: Activity,
          },
          {
            title: 'Flange Progress',
            href: '/erection/flange-progress',
            icon: Bolt,
          },
        ],
      },
      {
        title: 'Tracking',
        href: '/tracking',
        icon: MapPin,
        children: [
          {
            title: 'Dashboard',
            href: '/tracking',
            icon: LayoutDashboard,
          },
          {
            title: 'Data Analysis',
            href: '/tracking/data-analysis',
            icon: Activity,
          },
          {
            title: 'Print Barcodes',
            href: '/tracking/print-barcodes',
            icon: Scan,
          },
        ],
      },
      {
        title: 'NDE Module',
        href: '/nde',
        icon: Scan,
        children: [
          {
            title: 'Batch Management',
            href: '/nde',
            icon: Scan,
          },
          {
            title: 'Dashboard',
            href: '/nde/dashboard',
            icon: Activity,
          },
        ],
      },
    ],
  },
  {
    title: 'REPORTS',
    items: [
      {
        title: 'Reports',
        href: '/reports',
        icon: FileText,
      },
    ],
  }, {
    title: 'TESTING',
    items: [
      {
        title: 'Testpack',
        href: '/testpack',
        icon: FlaskConical, // или TestTube2
        children: [
          {
            title: 'Builder',
            href: '/testpack/builder',
            icon: ListPlus,
          },
          {
            title: 'Explorer',
            href: '/testpack/explorer',
            icon: FolderTree,
          },
          {
            title: 'Pressure Test',
            href: '/testpack/pressure-test',
            icon: Gauge,
          },
        ],
      },
      {
        title: 'Flange Management',
        href: '/flange',
        icon: CircleDot,
      },
    ],
  },
  {
    title: 'CONFIGURATION',
    items: [
      {
        title: 'Settings',
        href: '/settings',
        icon: Settings,
      },
      {
        title: 'Documentation',
        href: '/documentation',
        icon: BookOpen,
      },
    ],
  },
]

function getVisibleItem(
  item: NavItem,
  can: (capability: Capability) => boolean,
): NavItem | null {
  const children = item.children
    ?.map((child) => getVisibleItem(child, can))
    .filter((child): child is NavItem => child !== null)
  const capability = requiredCapabilityForPath(item.href)

  if (!capability || can(capability) || children?.length) {
    return {
      ...item,
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
