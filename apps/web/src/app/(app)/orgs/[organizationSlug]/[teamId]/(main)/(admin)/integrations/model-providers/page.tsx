import { sdk } from '@/lib/sdk'
import type { OrganizationTeamParams } from '@/lib/types'
import { cacheTag } from 'next/cache'
import { ModelProviderList } from './_components/model-provider-list'

async function listModelProviders(params: {
  organizationSlug: string
}) {
  'use cache: private'
  cacheTag(
    'create-model-provider',
    'update-model-provider',
    'delete-model-provider',
  )

  const { data } = await sdk.listModelProviders({
    params: {
      organizationSlug: params.organizationSlug,
    },
  })

  return data?.modelProviders || []
}

export default async function Page({
  params,
}: Readonly<{
  params: Promise<OrganizationTeamParams>
}>) {
  const { organizationSlug } = await params

  const modelProviders = await listModelProviders({ organizationSlug })

  return (
    <ModelProviderList
      params={{ organizationSlug }}
      modelProviders={modelProviders}
    />
  )
}
