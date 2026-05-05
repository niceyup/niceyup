import { sdk } from '@/lib/sdk'
import type { OrganizationTeamParams } from '@/lib/types'
import { cacheTag } from 'next/cache'
import { VectorStoreList } from './_components/vector-store-list'

async function listVectorStores(params: {
  organizationSlug: string
}) {
  'use cache: private'
  cacheTag('create-vector-store', 'update-vector-store', 'delete-vector-store')

  const { data } = await sdk.listVectorStores({
    headers: {
      'x-organization-slug': params.organizationSlug,
    },
  })

  return data?.vectorStores || []
}

export default async function Page({
  params,
}: Readonly<{
  params: Promise<OrganizationTeamParams>
}>) {
  const { organizationSlug } = await params

  const vectorStores = await listVectorStores({ organizationSlug })

  return (
    <VectorStoreList
      params={{ organizationSlug }}
      vectorStores={vectorStores}
    />
  )
}
