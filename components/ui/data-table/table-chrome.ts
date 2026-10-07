export function tableChrome(input: {
  rowCount: number
  filteredCount: number
  pageSize: number
  page: number
  hasQuery: boolean
  variant: "full" | "compact"
}): {
  showToolbar: boolean
  showSearch: boolean
  showViewControls: boolean
  showPager: boolean
  showHeader: boolean
} {
  if (input.rowCount === 0 && !input.hasQuery) {
    return {
      showToolbar: false,
      showSearch: false,
      showViewControls: false,
      showPager: false,
      showHeader: false,
    }
  }

  const showPager = input.filteredCount > input.pageSize || input.page > 0
  const showHeader = input.rowCount > 0 || input.hasQuery

  let showSearch: boolean
  let showViewControls: boolean

  if (input.variant === "compact") {
    showViewControls = false
    showSearch = input.rowCount > 10
  } else {
    showSearch = true
    showViewControls = true
  }

  const showToolbar = showSearch || showViewControls || input.hasQuery

  return {
    showToolbar,
    showSearch,
    showViewControls,
    showPager,
    showHeader,
  }
}
