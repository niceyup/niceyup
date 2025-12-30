type ModelCosts = {
  provider: string
  model: string
  operator: 'equals' | 'startsWith' | 'includes'
  inputCostPer1M: number
  outputCostPer1M: number
  promptCacheWritePer1M?: number
  promptCacheReadPer1M?: number
  promptAudioPer1M?: number
  completionAudioPer1M?: number
  perImage?: number
  perCall?: number
}

let modelCostsCached: { data: ModelCosts[]; timestamp: number } | null = null

export async function listModelCosts() {
  try {
    const now = Date.now()
    const CACHE_TTL = 1000 * 60 * 60 // 1 hora

    if (
      modelCostsCached?.data &&
      now - modelCostsCached.timestamp < CACHE_TTL
    ) {
      return modelCostsCached.data
    }

    // Ref: https://github.com/Helicone/helicone/blob/333f379c32936a79bde969adb22bc9d3645fe60a/bifrost/app/api/llm-costs/route.ts

    const response = await fetch('https://www.helicone.ai/api/llm-costs')

    const body = await response.json()

    const modelCosts: ModelCosts[] = []

    for (const modelCost of body.data) {
      modelCosts.push({
        provider: modelCost.provider.toLowerCase(),
        model: modelCost.model,
        operator: modelCost.operator,
        inputCostPer1M: modelCost.input_cost_per_1m,
        outputCostPer1M: modelCost.output_cost_per_1m,

        // Add optional cost fields if they exist
        promptCacheWritePer1M: modelCost.prompt_cache_write_per_1m,
        promptCacheReadPer1M: modelCost.prompt_cache_read_per_1m,
        promptAudioPer1M: modelCost.prompt_audio_per_1m,
        completionAudioPer1M: modelCost.completion_audio_per_1m,
        perImage: modelCost.per_image,
        perCall: modelCost.per_call,
      })
    }

    modelCostsCached = { data: modelCosts, timestamp: now }

    return modelCosts
  } catch {
    throw new Error('Failed to list model costs')
  }
}

export const DEFAULT_SEPARATOR = '/' as const

export async function getModelCost<
  SEPARATOR extends string = typeof DEFAULT_SEPARATOR,
>({
  provider,
  model,
  operator = 'equals',
  separator = DEFAULT_SEPARATOR as SEPARATOR,
}: (
  | {
      provider?: never
      model: `${string}${SEPARATOR}${string}`
      separator?: SEPARATOR
    }
  | {
      provider: string
      model: string
      separator?: never
    }
) & {
  operator?: 'equals' | 'startsWith' | 'includes'
}) {
  try {
    let _provider: string | undefined = provider
    let _model: string | undefined = model

    if (model?.includes(separator)) {
      const [__provider, __model] = model.split(separator)

      _provider = __provider
      _model = __model
    }

    if (!_provider || !_model) {
      return
    }

    const modelCosts = await listModelCosts()

    return modelCosts.find(
      (modelCost) =>
        modelCost.provider.toLowerCase() === _provider.toLowerCase() &&
        (operator === 'startsWith'
          ? modelCost.model.startsWith(_model)
          : operator === 'includes'
            ? modelCost.model.includes(_model)
            : modelCost.model === _model) &&
        modelCost.operator === operator,
    )
  } catch {
    throw new Error('Failed to get model cost')
  }
}
