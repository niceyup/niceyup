import { sdk } from '@/lib/sdk'
import type { OrganizationTeamParams } from '@/lib/types'
import { EditModelProviderForm } from '../../../_components/edit-model-provider-form'

type Params = {
  organizationSlug: OrganizationTeamParams['organizationSlug']
  modelProviderId: string
}

export async function EditModelProviderWrapper({
  params,
}: {
  params: Params
}) {
  const { data } = await sdk.getModelProvider({
    modelProviderId: params.modelProviderId,
    params: { organizationSlug: params.organizationSlug },
  })

  if (!data) {
    return null
  }

  return <EditModelProviderForm initialData={data.modelProvider} />
}
