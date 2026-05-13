'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Search,
  Bell,
  HelpCircle,
  Settings,
  ChevronRight,
  ChevronDown,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { useRole, ROLES } from '@/contexts/role-context'

// Demo projects
const projects = [
  { id: 'proj-1', code: 'PROJ-LNG-2025', name: 'Qatar LNG Train 7' },
  { id: 'proj-2', code: 'PROJ-REF-2024', name: 'Kuwait Refinery Upgrade' },
  { id: 'proj-3', code: 'PROJ-PET-2025', name: 'Saudi Petrochemical Plant' },
]

// Route labels for breadcrumb
const routeLabels: Record<string, string> = {
  admin: 'Admin Module',
  spooling: 'Spooling Module',
  fabrication: 'Fabrication',
  'weld-progress': 'Weld Progress',
  dashboard: 'Dashboard',
  tracking: 'Tracking',
  nde: 'NDE Module',
  reports: 'Reports',
  settings: 'Settings',
  documentation: 'Documentation',
}

export function TopNav() {
  const pathname = usePathname()
  const { roleInfo, currentRole, setCurrentRole } = useRole()
  const [selectedProject, setSelectedProject] = React.useState(projects[0])

  // Generate breadcrumb from pathname
  const breadcrumbs = React.useMemo(() => {
    const segments = pathname.split('/').filter(Boolean)
    return segments.map((segment, index) => ({
      label: routeLabels[segment] || segment,
      href: '/' + segments.slice(0, index + 1).join('/'),
      isLast: index === segments.length - 1,
    }))
  }, [pathname])

  return (
    <header className="flex h-12 shrink-0 items-center border-b border-border bg-background px-4">
      {/* Left Side */}
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded bg-primary">
            <span className="text-xs font-bold text-primary-foreground">PQ</span>
          </div>
          <span className="text-sm font-semibold text-foreground">PipeQC</span>
        </Link>

        <Separator orientation="vertical" className="mx-2 h-5" />

        {/* Project Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs">
              <span className="font-medium text-foreground">{selectedProject.code}</span>
              <span className="text-muted-foreground">·</span>
              <span className="max-w-[140px] truncate text-muted-foreground">
                {selectedProject.name}
              </span>
              <ChevronDown className="ml-1 size-3 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[280px]">
            {projects.map((project) => (
              <DropdownMenuItem
                key={project.id}
                onClick={() => setSelectedProject(project)}
                className={cn(
                  'flex flex-col items-start gap-0.5',
                  selectedProject.id === project.id && 'bg-accent'
                )}
              >
                <span className="text-sm font-medium">{project.code}</span>
                <span className="text-xs text-muted-foreground">{project.name}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Breadcrumb */}
        {breadcrumbs.length > 0 && (
          <>
            <Separator orientation="vertical" className="mx-2 h-5" />
            <nav className="flex items-center gap-1 text-xs">
              {breadcrumbs.map((crumb, index) => (
                <React.Fragment key={crumb.href}>
                  {index > 0 && (
                    <ChevronRight className="size-3 text-muted-foreground" />
                  )}
                  {crumb.isLast ? (
                    <span className="font-medium text-foreground">{crumb.label}</span>
                  ) : (
                    <Link
                      href={crumb.href}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {crumb.label}
                    </Link>
                  )}
                </React.Fragment>
              ))}
            </nav>
          </>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right Side */}
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="size-8">
          <Search className="size-4 text-muted-foreground" />
          <span className="sr-only">Search</span>
        </Button>

        <Button variant="ghost" size="icon" className="relative size-8">
          <Bell className="size-4 text-muted-foreground" />
          <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
            3
          </span>
          <span className="sr-only">Notifications</span>
        </Button>

        <Button variant="ghost" size="icon" className="size-8">
          <HelpCircle className="size-4 text-muted-foreground" />
          <span className="sr-only">Help</span>
        </Button>

        <Button variant="ghost" size="icon" className="size-8">
          <Settings className="size-4 text-muted-foreground" />
          <span className="sr-only">Settings</span>
        </Button>

        <Separator orientation="vertical" className="mx-2 h-5" />

        {/* User Block with Role Switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-2 px-2">
              <Avatar className="size-6">
                <AvatarImage src="/avatars/user.jpg" alt="A. Rahman" />
                <AvatarFallback className="text-[10px]">AR</AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start">
                <span className="text-xs font-medium leading-none">A. Rahman</span>
                <span className="text-[10px] leading-none text-muted-foreground">
                  {roleInfo.label}
                </span>
              </div>
              <ChevronDown className="size-3 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[200px]">
            {ROLES.map((role) => (
              <DropdownMenuItem
                key={role.id}
                onClick={() => setCurrentRole(role.id)}
                className={cn(
                  'flex flex-col items-start gap-0.5',
                  currentRole === role.id && 'bg-accent'
                )}
              >
                <span className="text-sm font-medium">{role.label}</span>
                <span className="text-xs text-muted-foreground">{role.description}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
