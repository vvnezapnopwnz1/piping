"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Search,
  HelpCircle,
  Settings,
  ChevronRight,
  ChevronDown,
  LogOut,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useSupabaseAuth } from "@/contexts/supabase-auth-context";

import { getTopNavDisplay } from "./top-nav-state";

const ACCESS_ROLE_LABELS: Record<string, string> = {
  project_admin: "Project Admin",
  site_admin: "Site Admin",
  project_editor: "Project Editor",
  subcontractor: "Subcontractor",
  project_reader: "Project Reader",
};

const FUNCTIONAL_ROLE_LABELS: Record<string, string> = {
  project_manager: "Project Manager",
  qc_engineer: "QC Engineer",
  nde_inspector: "NDE Inspector",
  spooling_team: "Spooling Team",
  fabrication_contributor: "Fabrication Contributor",
  erection_contributor: "Erection Contributor",
  tracking_operator: "Tracking Operator",
};

function accessLabels(access: {
  isPlatformAdmin: boolean;
  accessRole: string | null;
  functionalRoles: readonly string[];
}): string[] {
  if (access.isPlatformAdmin) return ["System Admin"];

  return [
    ...(access.accessRole ? [ACCESS_ROLE_LABELS[access.accessRole] ?? access.accessRole] : []),
    ...access.functionalRoles.map(
      (role) => FUNCTIONAL_ROLE_LABELS[role] ?? role,
    ),
  ];
}

// Route labels for breadcrumb
const routeLabels: Record<string, string> = {
  admin: "Admin",
  spooling: "Spooling Module",
  fabrication: "Fabrication",
  "weld-progress": "Weld Progress",
  dashboard: "Dashboard",
  tracking: "Tracking",
  nde: "NDE Module",
  reports: "Reports",
  settings: "Settings",
  documentation: "Documentation",
  testpack: "Testpack",
  "pressure-test": "Pressure Test",
  "line-check": "Line Check",
  "item-clearance": "Item Clearance",
  blinding: "Blinding",
  "testing-precomm": "Testing & Pre-comm",
  reinstatement: "Reinstatement",
  preparation: "Preparation",
  progress: "Progress",
  explorer: "Explorer",
  flange: "Flange Management",
  erection: "Erection",
  "site-weld-progress": "Site Weld Progress",
};

export function TopNav() {
  const pathname = usePathname();
  const { access, projectAccesses, selectProject, signOut, user } = useSupabaseAuth();

  const supabaseProjects = React.useMemo(
    () =>
      projectAccesses.map((m) => {
        return {
          projectId: m.projectId,
          activityCode: m.activityCode,
          title: m.title,
          accessLabels: accessLabels(m),
        };
      }),
    [projectAccesses]
  );

  const topNavDisplay = getTopNavDisplay({
    access: access
      ? {
          projectId: access.projectId,
          activityCode: access.activityCode,
          title: access.title,
          accessLabels: accessLabels(access),
        }
      : null,
    projectAccesses: supabaseProjects,
    email: user?.email,
  });

  // Generate breadcrumb from pathname
  const breadcrumbs = React.useMemo(() => {
    const segments = pathname.split("/").filter(Boolean);
    return segments.map((segment, index) => ({
      label: routeLabels[segment] || segment,
      href: "/" + segments.slice(0, index + 1).join("/"),
      isLast: index === segments.length - 1,
    }));
  }, [pathname]);

  return (
    <header className="flex h-12 shrink-0 items-center border-b border-border bg-background px-4">
      {/* Left Side */}
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded bg-primary">
            <span className="text-xs font-bold text-primary-foreground">
              PQ
            </span>
          </div>
          <span className="text-sm font-semibold text-foreground">PipeQC</span>
        </Link>

        <Separator orientation="vertical" className="mx-2 h-5" />

        {topNavDisplay.canSwitchProject ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 px-2 text-xs"
              >
                <span className="font-medium text-foreground">
                  {topNavDisplay.project.activityCode}
                </span>
                <span className="text-muted-foreground">·</span>
                <span className="max-w-[140px] truncate text-muted-foreground">
                  {topNavDisplay.project.title}
                </span>
                <ChevronDown className="ml-1 size-3 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[280px]">
              {topNavDisplay.projects.map((proj) => (
                <DropdownMenuItem
                  key={proj.projectId}
                  onClick={() => selectProject(proj.projectId)}
                  className={cn(
                    "flex flex-col items-start gap-0.5",
                    topNavDisplay.project.projectId === proj.projectId && "bg-accent",
                  )}
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="text-sm font-medium">{proj.activityCode}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {proj.accessLabels.join(" · ")}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {proj.title}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex h-7 items-center gap-1 px-2 text-xs">
            <span className="font-medium text-foreground">
              {topNavDisplay.project.activityCode}
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="max-w-[140px] truncate text-muted-foreground">
              {topNavDisplay.project.title}
            </span>
          </div>
        )}

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
                    <span className="font-medium text-foreground">
                      {crumb.label}
                    </span>
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

        {/* The notification bell counted unread items in the demo notifications store. A
            notification feed over durable records is Track 11; an always-empty bell would only
            claim there is nothing to see. */}

        <Button variant="ghost" size="icon" className="size-8">
          <HelpCircle className="size-4 text-muted-foreground" />
          <span className="sr-only">Help</span>
        </Button>

        <Button variant="ghost" size="icon" className="size-8">
          <Settings className="size-4 text-muted-foreground" />
          <span className="sr-only">Settings</span>
        </Button>

        <Separator orientation="vertical" className="mx-2 h-5" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-2 px-2">
              <Avatar className="size-6">
                <AvatarFallback className="text-[10px]">
                  {topNavDisplay.email.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-col items-start">
                <span className="max-w-[180px] truncate text-xs font-medium leading-none">
                  {topNavDisplay.email}
                </span>
                <span className="text-[10px] leading-none text-muted-foreground">
                  {topNavDisplay.accessLabels.join(" · ") || "Project access"}
                </span>
              </div>
              <ChevronDown className="size-3 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => void signOut()}>
              <LogOut className="mr-2 size-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
