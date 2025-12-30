import { sdk } from '@/lib/sdk'

export type Provider = NonNullable<
  Awaited<ReturnType<typeof sdk.listProviders>>['data']
>['providers'][number]

export const ProviderAppEnum = sdk.$types.providerAppEnum

export type ProviderAppEnum =
  (typeof ProviderAppEnum)[keyof typeof ProviderAppEnum]
