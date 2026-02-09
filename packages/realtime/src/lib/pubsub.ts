import type { Redis } from '@workspace/cache'
import type { WebSocket } from 'ws'
import { handleMessageSocket, socketsByChannel } from './socket'

let publisher: Redis
let subscriber: Redis

export function initializeRealtimePubSub({ redis }: { redis: Redis }) {
  if (!publisher) {
    publisher = redis
  }

  if (!subscriber) {
    subscriber = redis.duplicate()
    subscriber.on('message', handleMessageSocket)
  }
}

export class RealtimePubSub<Channel extends string> {
  async subscribe({
    channel,
    socket,
  }: {
    channel: Channel
    socket: WebSocket
  }) {
    if (!socketsByChannel.has(channel)) {
      socketsByChannel.set(channel, new Set())
      await subscriber.subscribe(channel)
    }

    const sockets = socketsByChannel.get(channel)!
    sockets.add(socket)

    socket.on('close', async () => {
      sockets.delete(socket)
      if (!sockets.size) {
        socketsByChannel.delete(channel)
        await subscriber.unsubscribe(channel)
      }
    })
  }

  async emit<T = unknown>({
    channel,
    data,
  }: {
    channel: Channel
    data: T
  }) {
    await publisher.publish(channel, JSON.stringify({ channel, data }))
  }
}
