import { createLoader, parseAsStringLiteral } from 'nuqs/server'

export type TabValue = 'member' | 'pending'

export const searchParams = {
  tab: parseAsStringLiteral<TabValue>(['member', 'pending']).withDefault(
    'member',
  ),
}

export const loadSearchParams = createLoader(searchParams)
