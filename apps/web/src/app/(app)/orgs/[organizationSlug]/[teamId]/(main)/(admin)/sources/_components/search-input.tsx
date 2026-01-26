'use client'

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@workspace/ui/components/input-group'
import { useDebouncedCallback } from '@workspace/ui/hooks/use-debounced-callback'
import { SearchIcon } from 'lucide-react'
import { useQueryStates } from 'nuqs'
import * as React from 'react'
import { searchParams } from '../_lib/search-params'

const DEBOUNCE_MS = 300
const THROTTLE_MS = 50

export function SearchInput() {
  const [{ search: querySearch }, setSearchParams] = useQueryStates(
    searchParams,
    {
      clearOnDefault: true,
      shallow: false,
      throttleMs: THROTTLE_MS,
    },
  )

  const [search, setSearch] = React.useState(querySearch)

  const debouncedSetSearchParams = useDebouncedCallback(
    setSearchParams,
    DEBOUNCE_MS,
  )

  function handleSearchChange(value: string) {
    setSearch(value)
    debouncedSetSearchParams({ search: value, folderId: null })
  }

  return (
    <InputGroup className="h-11 bg-background">
      <InputGroupAddon>
        <SearchIcon />
      </InputGroupAddon>
      <InputGroupInput
        type="search"
        value={search}
        onChange={(event) => handleSearchChange(event.target.value)}
        placeholder="Find Sources..."
        className="[&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none [&::-webkit-search-results-button]:appearance-none [&::-webkit-search-results-decoration]:appearance-none"
      />
    </InputGroup>
  )
}
