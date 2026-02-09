import { WebSocket } from 'ws'

export const socketsByChannel = new Map<string, Set<WebSocket>>()

export function handleMessageSocket(channel: string, message: string) {
  const sockets = socketsByChannel.get(channel)
  if (!sockets) {
    return
  }

  for (const socket of [...sockets]) {
    if (socket.readyState !== WebSocket.OPEN) {
      sockets.delete(socket)
      continue
    }

    try {
      socket.send(message)
    } catch {
      sockets.delete(socket)
    }
  }
}
