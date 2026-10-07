"use client"

import { useTranslations } from "next-intl"
import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowUpRight, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { useAccess } from "@/modules/access/ui/access-context"
import { getPageDestinations, scorePageQuery } from "./navigation-model"
import { useNavName } from "./nav-name"

export function PageFinder() {
  const [open, setOpen] = React.useState(false)
  const { can } = useAccess()
  const router = useRouter()
  const t = useTranslations("shell.pageFinder")
  const name = useNavName()
  const pages = React.useMemo(() => getPageDestinations(can, name), [can, name])
  const sections = [...new Set(pages.map(page => page.section))]
  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setOpen(previous => !previous)
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [])
  return <>
    <Button variant="ghost" size="sm" className="h-8 gap-2 px-2" onClick={() => setOpen(true)} aria-label={t("open")}>
      <Search className="size-4" />
      <span className="hidden lg:inline text-xs text-muted-foreground">{t("open")}</span>
      <kbd className="hidden lg:inline rounded border px-1 text-[10px] text-muted-foreground">⌘ K</kbd>
    </Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-xl" showCloseButton={false}>
        <DialogHeader className="sr-only">
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <Command filter={scorePageQuery}>
          <CommandInput placeholder={t("placeholder")} aria-label={t("inputLabel")} className="h-12" />
          <CommandList className="max-h-[min(60vh,440px)] p-2">
            <CommandEmpty>{t("empty")}</CommandEmpty>
            {sections.map(section => <CommandGroup key={section} heading={section}>
              {pages.filter(page => page.section === section).map(page => <CommandItem key={page.href} value={`${page.title} ${page.context} ${page.href}`} onSelect={() => { setOpen(false); router.push(page.href) }} className="min-h-11">
                <span className="flex flex-1 flex-col gap-0.5"><span>{page.title}</span>{page.context && <span className="text-xs text-muted-foreground">{page.context}</span>}</span>
                <ArrowUpRight className="size-3 text-muted-foreground" />
              </CommandItem>)}
            </CommandGroup>)}
          </CommandList>
        </Command>
        <p className="border-t px-4 py-2 text-xs text-muted-foreground">{t("hint")}</p>
      </DialogContent>
    </Dialog>
  </>
}
