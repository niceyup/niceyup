import type { sdk } from '@/lib/sdk'

export type Providers = NonNullable<
  Awaited<ReturnType<typeof sdk.listProviders>>['data']
>['providers']
