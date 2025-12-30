import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import type { FastifyTypedInstance } from '@/types/fastify'
import { embeddingModels, languageModels } from '@workspace/engine/models'
import {
  DEFAULT_SEPARATOR,
  listModelCosts as listModelCostsFn,
} from '@workspace/engine/models/costs'
import { z } from 'zod'

export async function listModelCosts(app: FastifyTypedInstance) {
  app.get(
    '/models/costs',
    {
      schema: {
        tags: ['Models'],
        description: 'List model costs',
        operationId: 'listModelCosts',
        response: withDefaultErrorResponses({
          200: z
            .object({
              modelCosts: z.array(
                z.object({
                  provider: z.string(),
                  model: z.string(),
                  operator: z.enum(['equals', 'startsWith', 'includes']),
                  inputCostPer1M: z.number(),
                  outputCostPer1M: z.number(),
                  promptCacheWritePer1M: z.number().optional(),
                  promptCacheReadPer1M: z.number().optional(),
                  promptAudioPer1M: z.number().optional(),
                  completionAudioPer1M: z.number().optional(),
                  perImage: z.number().optional(),
                  perCall: z.number().optional(),
                }),
              ),
            })
            .describe('Success'),
        }),
      },
    },
    async () => {
      const modelCosts = await listModelCostsFn()

      const availableModels = [...languageModels, ...embeddingModels]

      return {
        modelCosts: modelCosts.filter((modelCost) =>
          availableModels.includes(
            `${modelCost.provider}${DEFAULT_SEPARATOR}${modelCost.model}`,
          ),
        ),
      }
    },
  )
}
