"use client"

import * as React from "react"
import { useId, useState } from "react"
import { ChevronsUpDown, X, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

export interface ReferenceOption {
  id: string
  label: string
}

export interface ReferenceComboboxProps {
  label: string
  selectedId: string | null
  selectedLabel: string | null
  options: readonly ReferenceOption[]
  query: string
  loading: boolean
  loadingMore?: boolean
  error: string | null
  onQueryChange: (query: string) => void
  onChoose: (id: string) => void
  onClear: () => void
  onLoadMore?: () => void
  hasMore?: boolean
  onRetry?: () => void
  disabled?: boolean
  emptyMessage?: string
  placeholder?: string
}

export function ReferenceCombobox({
  label,
  selectedId,
  selectedLabel,
  options,
  query,
  loading,
  loadingMore = false,
  error,
  onQueryChange,
  onChoose,
  onClear,
  onLoadMore,
  hasMore = false,
  onRetry,
  disabled = false,
  emptyMessage = "No matching traces",
  placeholder = "Select registered trace",
}: ReferenceComboboxProps) {
  const [open, setOpen] = useState(false)
  const listId = useId()

  return (
    <div className="flex items-center gap-1.5 w-full">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-label={label}
            aria-expanded={open}
            aria-controls={listId}
            disabled={disabled}
            className="w-full justify-between font-normal text-left truncate h-9 px-3"
          >
            <span className="truncate">
              {selectedLabel ?? placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[min(30rem,calc(100vw-2rem))] p-0"
          align="start"
        >
          <Command shouldFilter={false}>
            <CommandInput
              aria-label={`Search ${label}`}
              placeholder="Search trace or MRR…"
              value={query}
              onValueChange={onQueryChange}
            />
            <CommandList id={listId} aria-label={label} className="max-h-60 overflow-y-auto">
              {loading && options.length === 0 ? (
                <div role="status" className="p-3 text-sm text-center text-muted-foreground">
                  Searching registered materials…
                </div>
              ) : null}

              {error ? (
                <div role="alert" className="p-3 text-sm text-destructive flex items-center justify-between gap-2">
                  <span>{error}</span>
                  {onRetry ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={onRetry}
                      className="shrink-0 text-xs h-7 px-2"
                    >
                      Retry
                    </Button>
                  ) : null}
                </div>
              ) : null}

              {!loading && !error && options.length === 0 ? (
                <div className="p-3 text-sm text-center text-muted-foreground">
                  {emptyMessage}
                </div>
              ) : null}

              {options.map((option) => {
                const isSelected = option.id === selectedId
                return (
                  <CommandItem
                    key={option.id}
                    value={option.id}
                    onSelect={() => {
                      onChoose(option.id)
                      setOpen(false)
                    }}
                    className="cursor-pointer flex items-center justify-between px-3 py-2 text-sm"
                  >
                    <span className="min-w-0 whitespace-normal break-words pr-2">
                      {option.label}
                    </span>
                    {isSelected ? (
                      <Check className="h-4 w-4 shrink-0 text-primary" />
                    ) : null}
                  </CommandItem>
                )
              })}

              {hasMore && onLoadMore ? (
                <div className="p-2 border-t text-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onLoadMore}
                    disabled={loadingMore}
                    className="w-full text-xs h-8"
                  >
                    {loadingMore ? "Loading more…" : "Load more"}
                  </Button>
                </div>
              ) : null}
            </CommandList>
            {selectedId && !disabled ? (
              <div className="border-t p-1.5 flex justify-end bg-muted/30">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onClear()
                    setOpen(false)
                  }}
                  className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground"
                >
                  Clear selection
                </Button>
              </div>
            ) : null}
          </Command>
        </PopoverContent>
      </Popover>

      {selectedId && !disabled ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Clear ${label}`}
          onClick={onClear}
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  )
}
