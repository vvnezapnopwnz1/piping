'use client'

import * as React from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'

import { cn } from '@/lib/utils'

/**
 * Two looks, one component, because the app nests tabs two deep and a pill inside a pill tells the
 * operator nothing about which level they are on.
 *
 * `underline` is navigation between the sections of a page — it reads as "these are pages".
 * `pill` switches the slice of one section's content — it reads as "this is a setting".
 *
 * Screens used to hand-roll the underline look out of <button> elements with `border-b-2`, which
 * meant no tab roles, no arrow keys, and no `aria-selected` on three of the busiest screens.
 */
type TabsVariant = 'pill' | 'underline'

const TabsVariantContext = React.createContext<TabsVariant>('pill')

function Tabs({
  className,
  variant = 'pill',
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root> & { variant?: TabsVariant }) {
  return (
    <TabsVariantContext.Provider value={variant}>
      <TabsPrimitive.Root
        data-slot="tabs"
        data-variant={variant}
        className={cn('flex flex-col gap-2', className)}
        {...props}
      />
    </TabsVariantContext.Provider>
  )
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  const variant = React.useContext(TabsVariantContext)

  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        'inline-flex items-center',
        variant === 'pill'
          ? 'bg-muted text-muted-foreground h-9 w-fit justify-center rounded-lg p-[3px]'
          : // The rule runs the full width so the unselected tabs sit on a line rather than
            // floating; the selected one overprints it with the accent.
            'text-muted-foreground w-full justify-start gap-4 overflow-x-auto border-b',
        className,
      )}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  const variant = React.useContext(TabsVariantContext)

  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring inline-flex items-center justify-center gap-1.5 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        variant === 'pill'
          ? "data-[state=active]:bg-background dark:data-[state=active]:text-foreground dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 text-foreground dark:text-muted-foreground h-[calc(100%-1px)] flex-1 rounded-md border border-transparent px-2 py-1 data-[state=active]:shadow-sm"
          : // -mb-px pulls the trigger's own border on top of the list's, so the two do not stack
            // into a 2px line under the selected tab.
            'data-[state=active]:border-primary data-[state=active]:text-primary hover:text-foreground -mb-px shrink-0 border-b-2 border-transparent px-1 pb-2',
        className,
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn('flex-1 outline-none', className)}
      {...props}
    />
  )
}

/**
 * The count that belongs to a tab. Tabular figures so a strip of counts does not shift sideways
 * as the numbers load, and `aria-hidden` because the trigger's own text already names the tab —
 * a screen reader announcing "Teams 42" as one label reads as a name, not a name and a count.
 */
function TabsCount({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-muted-foreground text-xs tabular-nums" aria-hidden="true">
      {children}
    </span>
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, TabsCount }
