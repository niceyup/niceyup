import { sdk } from '@/lib/sdk'
import type { OrganizationTeamParams } from '@/lib/types'
import { cacheTag } from 'next/cache'
import { ProviderList } from './_components/provider-list'

async function listProviders(params: { organizationSlug: string }) {
  'use cache: private'
  cacheTag('create-provider', 'delete-provider')

  const { data } = await sdk.listProviders({
    params: { organizationSlug: params.organizationSlug },
  })

  return data?.providers || []
}

export default async function Page({
  params,
}: Readonly<{
  params: Promise<OrganizationTeamParams>
}>) {
  const { organizationSlug } = await params

  const providers = await listProviders({ organizationSlug })

  return (
    <div className="flex size-full flex-1 flex-col">
      <div className="border-b bg-background p-4">
        <div className="mx-auto flex max-w-4xl flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <h2 className="font-semibold text-sm">Providers</h2>
              <p className="mt-1 text-muted-foreground text-sm">
                Add your own provider API keys to run models in your agents.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center gap-4 p-4">
        <ProviderList params={{ organizationSlug }} providers={providers} />
      </div>
    </div>
  )
}
