import type { ModelType } from '@workspace/core/models'
import { db } from '@workspace/db'
import { and, eq } from '@workspace/db/orm'
import { modelProviders, modelSettings } from '@workspace/db/schema'

type GetModelSettingsParams = {
  modelSettingsId: string
  type: ModelType
}

export async function getModelSettings(params: GetModelSettingsParams) {
  const [modelSettingsData] = await db
    .select({
      id: modelSettings.id,
      model: modelSettings.model,
      type: modelSettings.type,
      options: modelSettings.options,
      provider: {
        id: modelProviders.id,
        name: modelProviders.name,
        provider: modelProviders.provider,
        settings: modelProviders.settings,
        credentials: modelProviders.credentials,
      },
    })
    .from(modelSettings)
    .leftJoin(modelProviders, eq(modelSettings.providerId, modelProviders.id))
    .where(
      and(
        eq(modelSettings.id, params.modelSettingsId),
        eq(modelSettings.type, params.type),
      ),
    )
    .limit(1)

  return modelSettingsData || null
}
