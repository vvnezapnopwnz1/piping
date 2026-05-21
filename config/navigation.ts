import {
  Shield,
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
  Inbox,
  GitBranch,
  Send,
} from 'lucide-react'
import type { Role } from '@/contexts/role-context'

export interface NavItem {
  title: string
  href: string
  icon: LucideIcon
  children?: NavItem[]
}

export interface NavSection {
  title: string
  items: NavItem[]
  roles: Role[]
}

export const navigationConfig: NavSection[] = [
  {
    title: 'SETUP',
    roles: ['system_admin', 'project_manager'],
    items: [
      {
        title: 'Admin Module',
        href: '/admin',
        icon: Shield,
      },
    ],
  },
  {
    title: 'PREPARATION',
    roles: ['spooling_team', 'project_manager'],
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
    roles: ['qc_engineer', 'nde_inspector', 'subcontractor', 'project_manager'],
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
      },
      {
        title: 'NDE Module',
        href: '/nde',
        icon: Scan,
      },
    ],
  },
  {
    title: 'REPORTS',
    roles: ['project_manager', 'qc_engineer'],
    items: [
      {
        title: 'Reports',
        href: '/reports',
        icon: FileText,
      },
    ],
  }, {
    title: 'TESTING',
    roles: ['qc_engineer', 'project_manager', 'nde_inspector'],
    items: [
      {
        title: 'Testpack',
        href: '/testpack',
        icon: FlaskConical, // или TestTube2
        children: [
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
    roles: ['qc_engineer', 'nde_inspector', 'project_manager', 'spooling_team', 'subcontractor', 'system_admin'],
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

export function getVisibleNavigation(role: Role): NavSection[] {
  return navigationConfig
    .filter((section) => section.roles.includes(role))
    .map((section) => ({
      ...section,
      items: section.items,
    }))
}
