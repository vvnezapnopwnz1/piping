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
        title: 'Spooling Module',
        href: '/spooling',
        icon: Box,
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
            title: 'Weld Progress',
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
            title: 'Site Weld Progress',
            href: '/erection/weld-progress',
            icon: Activity,
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
