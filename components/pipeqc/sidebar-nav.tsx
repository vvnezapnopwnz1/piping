"use client";

import { useTranslations } from "next-intl";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuAction,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { getVisibleNavigation, type NavItem } from "@/config/navigation";
import { useNavName } from "./nav-name";
import type { Capability } from "@/modules/access/domain/capability";
import { useAccess } from "@/modules/access/ui/access-context";
import { canVisit, firstAccessibleDestination } from "./navigation-model";

// Open the destination's ancestors on route changes, without preventing manual collapse.
function useRouteExpansion(pathname: string, item: NavItem) {
  const [choice, setChoice] = React.useState({ pathname, open: isPathUnderItem(pathname, item) });
  const open = choice.pathname === pathname ? choice.open : isPathUnderItem(pathname, item);
  return [open, (next: boolean) => setChoice({ pathname, open: next })] as const;
}

// Helper: check if pathname matches this item or any descendant
function isPathUnderItem(pathname: string, item: NavItem): boolean {
  if (pathname === item.href || pathname.startsWith(item.href + "/")) {
    return true;
  }
  if (item.children) {
    return item.children.some((child) => isPathUnderItem(pathname, child));
  }
  return false;
}

// Recursive tree item renderer supporting arbitrary nesting depth
function NavTreeItem({ item, depth = 0 }: { item: NavItem; depth?: number }) {
  const t = useTranslations("shell.sidebar");
  const name = useNavName();
  const pathname = usePathname();
  const { state, setOpenMobile } = useSidebar();
  const { can } = useAccess();
  const destination = firstAccessibleDestination(item, can);
  const hasChildren = item.children && item.children.length > 0;
  const isActive = isPathUnderItem(pathname, item);
  const [isOpen, setIsOpen] = useRouteExpansion(pathname, item);

  // Collapsed sidebar: render as simple link with tooltip
  if (state === "collapsed") {
    return (
      <SidebarMenuItem>
        {depth === 0 && (
          <div
            className={cn(
              "absolute inset-y-0 left-0 w-1",
              isActive ? "bg-primary" : "bg-transparent",
            )}
          />
        )}
        <SidebarMenuButton
          asChild
          isActive={isActive}
          tooltip={name(item.title)}
          className="w-full"
        >
          <Link href={destination ?? "/"} onClick={() => setOpenMobile(false)} aria-current={pathname === destination ? "page" : undefined}>
            <item.icon className="size-4" />
            <span>{name(item.title)}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  // Leaf node (no children): render as link
  if (!hasChildren) {
    return (
      <SidebarMenuItem>
        {depth === 0 && (
          <div
            className={cn(
              "absolute inset-y-0 left-0 w-1",
              isActive ? "bg-primary" : "bg-transparent",
            )}
          />
        )}
        <SidebarMenuButton asChild isActive={isActive} tooltip={name(item.title)}>
          <Link href={item.href} onClick={() => setOpenMobile(false)} aria-current={pathname === item.href ? "page" : undefined}>
            <item.icon className="size-4" />
            <span>{name(item.title)}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  // Branch node (has children): collapsible with nested submenu
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <SidebarMenuItem>
        {depth === 0 && (
          <div
            className={cn(
              "absolute inset-y-0 left-0 w-1",
              isActive ? "bg-primary" : "bg-transparent",
            )}
          />
        )}
        {canVisit(item.href, can) ? <SidebarMenuButton asChild isActive={isActive} tooltip={name(item.title)} className="w-full pr-9">
          <Link href={item.href} onClick={() => setOpenMobile(false)} aria-current={pathname === item.href ? "page" : undefined}>
            <item.icon className="size-4" />
            <span>{name(item.title)}</span>
          </Link>
        </SidebarMenuButton> : <CollapsibleTrigger asChild><SidebarMenuButton isActive={isActive} className="pr-9"><item.icon className="size-4" /><span>{name(item.title)}</span></SidebarMenuButton></CollapsibleTrigger>}
        <CollapsibleTrigger asChild>
          <SidebarMenuAction aria-label={t(isOpen ? "collapse" : "expand", { item: name(item.title) })} className="size-7 top-1 right-0.5">
            <ChevronRight className={cn("transition-transform duration-200 motion-reduce:transition-none", isOpen && "rotate-90")} />
          </SidebarMenuAction>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub
            className={cn(
              depth > 0 && "ml-2 border-l-2 border-sidebar-border/50 pl-2",
            )}
          >
            {item.children?.map((child) => (
              <NavTreeSubItem key={child.href} item={child} depth={depth + 1} />
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

// Recursive sub-item renderer
function NavTreeSubItem({
  item,
  depth = 0,
}: {
  item: NavItem;
  depth?: number;
}) {
  const t = useTranslations("shell.sidebar");
  const name = useNavName();
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const { can } = useAccess();
  const hasChildren = item.children && item.children.length > 0;
  const isActive = isPathUnderItem(pathname, item);
  const [isOpen, setIsOpen] = useRouteExpansion(pathname, item);

  // Leaf node: simple link
  if (!hasChildren) {
    return (
      <SidebarMenuSubItem>
        <SidebarMenuSubButton asChild isActive={isActive}>
          <Link href={item.href} onClick={() => setOpenMobile(false)} aria-current={pathname === item.href ? "page" : undefined}>
            <item.icon className="size-4" />
            <span>{name(item.title)}</span>
          </Link>
        </SidebarMenuSubButton>
      </SidebarMenuSubItem>
    );
  }

  // Branch node: nested collapsible within sub-menu
  return (
    <SidebarMenuSubItem>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center gap-1">
          {canVisit(item.href, can) ? <SidebarMenuSubButton asChild isActive={isActive} className="min-w-0 flex-1">
            <Link href={item.href} onClick={() => setOpenMobile(false)} aria-current={pathname === item.href ? "page" : undefined}><item.icon className="size-4" /><span>{name(item.title)}</span></Link>
          </SidebarMenuSubButton> : <CollapsibleTrigger asChild><SidebarMenuSubButton isActive={isActive} className="min-w-0 flex-1"><item.icon className="size-4" /><span>{name(item.title)}</span></SidebarMenuSubButton></CollapsibleTrigger>}
          <CollapsibleTrigger className="flex size-7 shrink-0 items-center justify-center rounded hover:bg-sidebar-accent focus-visible:outline-2" aria-label={t(isOpen ? "collapse" : "expand", { item: name(item.title) })}>
            <ChevronRight className={cn("size-4 transition-transform duration-200 motion-reduce:transition-none", isOpen && "rotate-90")} />
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent>
          <ul
            className={cn(
              "flex flex-col gap-1 py-1",
              depth > 0 && "ml-2 border-l border-sidebar-border/30 pl-2",
            )}
          >
            {item.children?.map((child) => (
              <NavTreeSubItem key={child.href} item={child} depth={depth + 1} />
            ))}
          </ul>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuSubItem>
  );
}

function NavigationSidebar({
  can,
}: {
  can: (capability: Capability) => boolean
}) {
  const name = useNavName();
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  const visibleNavigation = React.useMemo(
    () => getVisibleNavigation(can),
    [can],
  );

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarContent className="pt-2">
        {/* Home Link */}
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === "/"}
                tooltip={name("home")}
              >
                <Link href="/" onClick={() => setOpenMobile(false)} aria-current={pathname === "/" ? "page" : undefined}>
                  <Home className="size-4" />
                  <span>{name("processOverview")}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        {/* Dynamic Navigation Sections */}
        {visibleNavigation.map((section) => (
          <SidebarGroup key={section.title}>
            <SidebarGroupLabel>{name(section.title)}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => (
                  <NavTreeItem key={item.href} item={item} depth={0} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}

export function SidebarNav() {
  const { can } = useAccess()
  return <NavigationSidebar can={can} />
}
