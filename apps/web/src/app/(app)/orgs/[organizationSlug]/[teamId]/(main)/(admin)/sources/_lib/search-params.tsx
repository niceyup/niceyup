import { createLoader, parseAsString } from 'nuqs/server'

export const searchParams = {
  folderId: parseAsString.withDefault(''),
  itemId: parseAsString.withDefault(''),
  search: parseAsString.withDefault(''),
}

export const loadSearchParams = createLoader(searchParams)
