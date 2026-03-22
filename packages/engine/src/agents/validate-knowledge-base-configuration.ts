import { InvalidArgumentError } from '../erros'
import { resolveEmbeddingModelSettings } from './resolve-model-settings'
import { resolveVectorStore } from './resolve-vector-store'

type ValidateKnowledgeBaseConfigurationParams = {
  id?: string | null
  vectorStoreId?: string | null
  embeddingModelSettingsId?: string | null
}

export const safeValidateKnowledgeBaseConfiguration = async (
  params: ValidateKnowledgeBaseConfigurationParams,
) => {
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
    return {
      success: false as const,
      data: null,
      error:
        error instanceof InvalidArgumentError
          ? error
          : {
              code: 'CONFIGURATION_INVALID',
              message: 'Configuration is invalid',
            },
    }
  }
}

export const validateKnowledgeBaseConfiguration = async (
  params: ValidateKnowledgeBaseConfigurationParams,
) => {
  const { success, data, error } =
    await safeValidateKnowledgeBaseConfiguration(params)

  if (!success) {
    throw new InvalidArgumentError(error)
  }

  return data
}
