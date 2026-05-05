import { resolveContextParams } from '@/lib/utils'
import type { FastifyTypedInstance } from '@/types/fastify'
import { fastifyPlugin } from 'fastify-plugin'

export const context = fastifyPlugin(async (app: FastifyTypedInstance) => {
  app.addHook('preHandler', async (request) => {
    if (!request.ctx) {
      request.ctx = {}
    }

    if (!request.ctxParams) {
      const contextParams = resolveContextParams({ headers: request.headers })

      request.ctxParams = contextParams
    }
  })
})
