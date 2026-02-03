import type { Provider } from '@workspace/core/providers'
import { db } from '@workspace/db'
import { eq } from '@workspace/db/orm'
import { providers } from '@workspace/db/schema'

type GetProviderSettingsParams = {
  provider: Provider
}

export async function getProviderSettings(params: GetProviderSettingsParams) {
  const [providerSettings] = await db
    .select({
      id: providers.id,
      provider: providers.provider,
      credentials: providers.credentials,
    })
    .from(providers)
    .where(eq(providers.provider, params.provider))
    .limit(1)

  return providerSettings || null
}
