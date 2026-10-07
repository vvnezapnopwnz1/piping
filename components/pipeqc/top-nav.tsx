"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, FolderOpen, Home, LogOut } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSupabaseAuth } from "@/contexts/supabase-auth-context";

import { LocaleMenuItems } from "@/components/pipeqc/locale-switch";
import { withProject } from "./project-url";
import { getTopNavDisplay } from "./top-nav-state";
import styles from "./workbench-shell.module.css";

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

/**
 * The sticky identity of the workspace: which project is open, the way back to its overview,
 * the way to every other project, and the user. `catalog` is the same bar over the project
 * list, where no project page tools apply.
 */
export function TopNav({ mode: _mode = "workspace" }: { mode?: "workspace" | "catalog" } = {}) {
  const pathname = usePathname();
  const { access: project, projectAccesses, signOut, user } = useSupabaseAuth();

  const topNavDisplay = getTopNavDisplay({
    access: project
      ? {
          projectId: project.projectId,
          activityCode: project.activityCode,
          title: project.title,
          accessLabels: accessLabels(project),
        }
      : null,
    projectAccesses: projectAccesses.map((m) => ({
      projectId: m.projectId,
      activityCode: m.activityCode,
      title: m.title,
      accessLabels: accessLabels(m),
    })),
    email: user?.email,
  });

  const code = project ? topNavDisplay.project.activityCode : null;
  const overview = withProject("/", code);

  return (
    <header className={styles.identity} data-identity-bar="">
      <div className={styles.identityMain}>
        <span className={styles.brand} aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false">
            <path d="M3 8h12a3 3 0 0 1 3 3v9" />
            <path d="M3 12h8" />
          </svg>
        </span>
        {project ? (
          <Link
            href={overview}
            className={styles.ident}
            aria-label={`Project ${topNavDisplay.project.activityCode} overview`}
            title={`${topNavDisplay.project.title} — project overview`}
          >
            <span className={styles.identCode}>{topNavDisplay.project.activityCode}</span>
            <span className={styles.identTitle}>{topNavDisplay.project.title}</span>
          </Link>
        ) : (
          <span className={styles.ident}>
            <span className={styles.identCode}>PipeQC</span>
            <span className={styles.identTitle}>No project open</span>
          </span>
        )}
      </div>

      <nav aria-label="Workspace" className={styles.identityActions}>
        <Link
          href="/projects"
          className={styles.barButton}
          aria-current={pathname === "/projects" ? "page" : undefined}
          aria-label="All projects"
        >
          <FolderOpen aria-hidden="true" />
          <span className={styles.hideNarrow}>All projects</span>
        </Link>
        {project ? (
          <Link
            href={overview}
            className={styles.barButton}
            aria-current={pathname === "/" ? "page" : undefined}
            aria-label={pathname === "/projects" ? `Return to ${topNavDisplay.project.activityCode}` : "Overview"}
          >
            <Home aria-hidden="true" />
            <span className={styles.hideNarrow}>
              {pathname === "/projects" ? `Return to ${topNavDisplay.project.activityCode}` : "Overview"}
            </span>
          </Link>
        ) : null}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className={styles.userButton}>
              <Avatar className="size-7">
                <AvatarFallback className="text-[10px]">
                  {topNavDisplay.email.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className={styles.userText}>
                <span className={styles.userEmail}>{topNavDisplay.email}</span>
                <span className={styles.userRole}>
                  {topNavDisplay.accessLabels[0] ?? "Project access"}
                </span>
              </span>
              <ChevronDown aria-hidden="true" className={styles.userChevron} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {topNavDisplay.accessLabels.slice(1).length > 0 ? (
              <>
                <DropdownMenuLabel className="max-w-[240px] text-xs font-normal text-muted-foreground">
                  {topNavDisplay.accessLabels.slice(1).join(" · ")}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
              </>
            ) : null}
            <LocaleMenuItems />
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => void signOut()}>
              <LogOut className="mr-2 size-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </nav>
    </header>
  );
}
