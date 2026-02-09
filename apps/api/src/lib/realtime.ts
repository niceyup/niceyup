import { initializeRealtimePubSub } from '@workspace/realtime/pubsub'
import type { FastifyInstance } from 'fastify'

export function fastifyRealtime(app: FastifyInstance) {
  app.ready().then(() => initializeRealtimePubSub({ redis: app.redis }))
}
