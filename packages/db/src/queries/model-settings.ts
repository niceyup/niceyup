import type { ModelType } from '@workspace/core/models'
import { db } from '@workspace/db'
import { and, eq } from '@workspace/db/orm'
import { modelSettings } from '@workspace/db/schema'

type GetModelSettingsParams = {
  modelSettingsId: string
  type: ModelType
}

export async function getModelSettings(params: GetModelSettingsParams) {
  const [modelSettingsData] = await db
    .select({
      id: modelSettings.id,
      provider: modelSettings.provider,
      model: modelSettings.model,
      type: modelSettings.type,
      options: modelSettings.options,
    })
    .from(modelSettings)
    .where(
      and(
        eq(modelSettings.id, params.modelSettingsId),
        eq(modelSettings.type, params.type),
      ),
    )
    .limit(1)

  return modelSettingsData || null
}
