import { InvalidArgumentError, NiceyupError } from '@workspace/core/errros'
import { resolveEmbeddingModelSettings } from './resolve-model-settings'
import { resolveVectorStore } from './resolve-vector-store'

type ValidateKnowledgeBaseConfigurationParams = {
  id?: string | null
  vectorStoreId?: string | null
  embeddingModelSettingsId?: string | null
}

export async function safeValidateKnowledgeBaseConfiguration(
  params: ValidateKnowledgeBaseConfigurationParams,
) {
  try {
    if (!params.id) {
      throw new InvalidArgumentError({
        code: 'ID_REQUIRED',
        message: 'ID is required',
      })
    }

    const [createVectorStore, embeddingModel] = await Promise.all([
      resolveVectorStore({ vectorStoreId: params.vectorStoreId }),
      resolveEmbeddingModelSettings({
        modelSettingsId: params.embeddingModelSettingsId,
      }),
    ])

    const vectorStore = createVectorStore({
      namespace: params.id,
      embeddingModel: embeddingModel.model,
    })

    return {
      success: true as const,
      data: {
        id: params.id,
        vectorStore,
        embeddingModel: embeddingModel,
      },
      error: null,
    }
  } catch (error) {
    const errorObject = NiceyupError.isInstance(error)
      ? { code: error.code, message: error.message }
      : { code: 'CONFIGURATION_INVALID', message: 'Configuration is invalid' }

    return {
      success: false as const,
      data: null,
      error: errorObject,
    }
  }
}

export async function validateKnowledgeBaseConfiguration(
  params: ValidateKnowledgeBaseConfigurationParams,
) {
  const { success, data, error } =
    await safeValidateKnowledgeBaseConfiguration(params)

  if (!success) {
    throw new InvalidArgumentError(error)
  }

  return data
}
