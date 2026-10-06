"use client"

import { Toaster } from "@/components/ui/sonner"

import { HelpProvider } from "./context-help"
import { TopNav } from "./top-nav"
import styles from "./workbench-shell.module.css"

/**
 * The project list, under the same identity bar as the workspace: the open project and the way
 * back to it stay where they are on every other page.
 */
export function ProjectCatalogShell({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className={styles.shell}>
      <a href="#main-content" className={styles.skip}>
        Skip to content
      </a>
      <HelpProvider>
        <TopNav mode="catalog" />
        {children}
      </HelpProvider>
      <Toaster richColors position="top-right" />
    </div>
  )
}
