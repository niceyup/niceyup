import { sdk } from '@/lib/sdk'
import type { OrganizationTeamParams } from '@/lib/types'
import { EditVectorStoreForm } from '../../../_components/edit-vector-store-form'

type Params = {
  organizationSlug: OrganizationTeamParams['organizationSlug']
  vectorStoreId: string
}

export async function EditVectorStoreWrapper({
  params,
}: {
  params: Params
}) {
  const { data } = await sdk.getVectorStore({
    headers: {
      'x-organization-slug': params.organizationSlug,
    },
    vectorStoreId: params.vectorStoreId,
  })

  if (!data) {
    return null
  }

  return <EditVectorStoreForm initialData={data.vectorStore} />
}
