"use client";

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
import { useRole } from "@/contexts/role-context";
import { getVisibleNavigation, type NavItem } from "@/config/navigation";

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
  const pathname = usePathname();
  const { state } = useSidebar();
  const hasChildren = item.children && item.children.length > 0;
  const isActive =
    pathname === item.href || (hasChildren && isPathUnderItem(pathname, item));
  const [isOpen, setIsOpen] = React.useState(isPathUnderItem(pathname, item));

  // Collapsed sidebar: render as simple link with tooltip
  if (state === "collapsed") {
    return (
      <SidebarMenuItem>
        {depth === 0 && (
          <div
            className={cn(
              "absolute inset-y-0 left-0 w-1",
              isActive ? "bg-primary" : "bg-slate-300 dark:bg-slate-600",
            )}
          />
        )}
        <SidebarMenuButton
          asChild
          isActive={isActive}
          tooltip={item.title}
          className="w-full"
        >
          <Link href={item.href}>
            <item.icon className="size-4" />
            <span>{item.title}</span>
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
              isActive ? "bg-primary" : "bg-slate-300 dark:bg-slate-600",
            )}
          />
        )}
        <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
          <Link href={item.href}>
            <item.icon className="size-4" />
            <span>{item.title}</span>
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
              isActive ? "bg-primary" : "bg-slate-300 dark:bg-slate-600",
            )}
          />
        )}
        <CollapsibleTrigger asChild>
          <SidebarMenuButton
            isActive={isActive}
            tooltip={item.title}
            className="w-full"
          >
            <item.icon className="size-4" />
            <span>{item.title}</span>
            <ChevronRight
              className={cn(
                "ml-auto size-4 transition-transform duration-200",
                isOpen && "rotate-90",
              )}
            />
          </SidebarMenuButton>
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
  const pathname = usePathname();
  const hasChildren = item.children && item.children.length > 0;
  const isActive = isPathUnderItem(pathname, item);
  const [isOpen, setIsOpen] = React.useState(isPathUnderItem(pathname, item));

  // Leaf node: simple link
  if (!hasChildren) {
    return (
      <SidebarMenuSubItem>
        <SidebarMenuSubButton asChild isActive={pathname === item.href}>
          <Link href={item.href}>
            <item.icon className="size-4" />
            <span>{item.title}</span>
          </Link>
        </SidebarMenuSubButton>
      </SidebarMenuSubItem>
    );
  }

  // Branch node: nested collapsible within sub-menu
  return (
    <SidebarMenuSubItem>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <SidebarMenuSubButton
            isActive={isActive}
            className="w-full justify-between"
          >
            <span className="flex items-center gap-2">
              <item.icon className="size-4" />
              <span>{item.title}</span>
            </span>
            <ChevronRight
              className={cn(
                "size-4 transition-transform duration-200",
                isOpen && "rotate-90",
              )}
            />
          </SidebarMenuSubButton>
        </CollapsibleTrigger>
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

// NavItemLink is now replaced by NavTreeItem — keeping for backward compatibility if needed
function NavItemLink({ item, isActive }: { item: NavItem; isActive: boolean }) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
        <Link href={item.href}>
          <item.icon className="size-4" />
          <span>{item.title}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function SidebarNav() {
  const pathname = usePathname();
  const { currentRole } = useRole();

  const visibleNavigation = React.useMemo(
    () => getVisibleNavigation(currentRole),
    [currentRole],
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
                tooltip="Home"
              >
                <Link href="/">
                  <Home className="size-4" />
                  <span>Home</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        {/* Dynamic Navigation Sections */}
        {visibleNavigation.map((section) => (
          <SidebarGroup key={section.title}>
            <SidebarGroupLabel>{section.title}</SidebarGroupLabel>
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
