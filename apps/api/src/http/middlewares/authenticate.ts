import type { FastifyTypedInstance } from '@/types/fastify'
import { auth, fromNodeHeaders } from '@workspace/auth'
import { resolveApiKeyConfigId } from '@workspace/auth/api-key'
import { fastifyPlugin } from 'fastify-plugin'
import { UnauthorizedError } from '../errors/unauthorized-error'

export const authenticate = fastifyPlugin(async (app: FastifyTypedInstance) => {
  app.addHook('preHandler', async (request) => {
    if (!request.ctx) {
      request.ctx = {}
    }

    if (!request.ctx.auth) {
      request.ctx.auth = {}
    }

    const xApiKey = request.headers['x-api-key']

    if (xApiKey) {
      const apiKey = String(xApiKey)

      const configId = resolveApiKeyConfigId({ apiKey })

      if (!configId) {
        throw new UnauthorizedError()
      }

      const { key } = await auth.api.verifyApiKey({
        body: { key: apiKey, configId },
      })

      if (!key) {
        throw new UnauthorizedError()
      }

      request.ctx.auth.apiKey = key
    } else {
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(request.headers),
      })

      if (!session) {
        throw new UnauthorizedError()
      }

      request.ctx.auth.authSession = session
    }
  })
})
