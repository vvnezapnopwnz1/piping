"use client";

import { useTranslations } from "next-intl";
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
import { codeLabel, type CodesTranslator } from "@/i18n/translator";

import { getTopNavDisplay } from "./top-nav-state";
import styles from "./workbench-shell.module.css";

/** The project access role first, then every functional role, in the operator's words. */
function accessLabels(
  access: {
    isPlatformAdmin: boolean;
    accessRole: string | null;
    functionalRoles: readonly string[];
  },
  tc: CodesTranslator,
): string[] {
  if (access.isPlatformAdmin) return [tc("accessRole.platform_admin")];

  return [
    ...(access.accessRole ? [codeLabel(tc, "accessRole", access.accessRole)] : []),
    ...access.functionalRoles.map((role) => codeLabel(tc, "functionalRole", role)),
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
  const tc = useTranslations("codes");
  const t = useTranslations("shell.topNav");

  const topNavDisplay = getTopNavDisplay({
    access: project
      ? {
          projectId: project.projectId,
          activityCode: project.activityCode,
          title: project.title,
          accessLabels: accessLabels(project, tc),
        }
      : null,
    projectAccesses: projectAccesses.map((m) => ({
      projectId: m.projectId,
      activityCode: m.activityCode,
      title: m.title,
      accessLabels: accessLabels(m, tc),
    })),
    email: user?.email,
    fallback: { activityCode: t("fallbackProject"), title: t("loadingProject"), email: t("authenticatedUser") },
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
            aria-label={t("projectOverviewLabel", { code: topNavDisplay.project.activityCode })}
            title={t("projectOverviewTitle", { title: topNavDisplay.project.title })}
          >
            <span className={styles.identCode}>{topNavDisplay.project.activityCode}</span>
            <span className={styles.identTitle}>{topNavDisplay.project.title}</span>
          </Link>
        ) : (
          <span className={styles.ident}>
            <span className={styles.identCode}>PipeQC</span>
            <span className={styles.identTitle}>{t("noProject")}</span>
          </span>
        )}
      </div>

      <nav aria-label={t("workspace")} className={styles.identityActions}>
        <Link
          href="/projects"
          className={styles.barButton}
          aria-current={pathname === "/projects" ? "page" : undefined}
          aria-label={t("allProjects")}
        >
          <FolderOpen aria-hidden="true" />
          <span className={styles.hideNarrow}>{t("allProjects")}</span>
        </Link>
        {project ? (
          <Link
            href={overview}
            className={styles.barButton}
            aria-current={pathname === "/" ? "page" : undefined}
            aria-label={pathname === "/projects" ? t("returnTo", { code: topNavDisplay.project.activityCode }) : t("overview")}
          >
            <Home aria-hidden="true" />
            <span className={styles.hideNarrow}>
              {pathname === "/projects" ? t("returnTo", { code: topNavDisplay.project.activityCode }) : t("overview")}
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
                  {topNavDisplay.accessLabels[0] ?? t("projectAccess")}
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
              {t("signOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </nav>
    </header>
  );
}
