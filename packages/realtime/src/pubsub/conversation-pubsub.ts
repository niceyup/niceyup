import type { WebSocket } from 'ws'
import { RealtimePubSub } from '../lib/pubsub'
import type {
  AIMessageNode,
  ConversationEvent,
  ConversationExplorerNodeEvent,
  ConversationsView,
} from '../lib/types'

type ConversationChannel = `conversations-${string}:messages`

export class ConversationPubSub extends RealtimePubSub<
  ConversationChannel | string
> {
  async subscribeMessages({
    conversationId,
    socket,
  }: {
    conversationId: string
    socket: WebSocket
  }) {
    return this.subscribe({
      channel: `conversations-${conversationId}:messages`,
      socket,
    })
  }

  async emitMessages({
    conversationId,
    data,
  }: {
    conversationId: string
    data: AIMessageNode[]
  }) {
    return this.emit({
      channel: `conversations-${conversationId}:messages`,
      data,
    })
  }

  async subscribeTeamConversations({
    agentId,
    teamId,
    view,
    socket,
  }: {
    agentId: string
    teamId: string
    view: ConversationsView
    socket: WebSocket
  }) {
    return this.subscribe({
      channel: `agents-${agentId}-conversations:team-${teamId}${view === 'explorer' ? ':explorer' : ''}`,
      socket,
    })
  }

  async emitTeamConversations({
    agentId,
    teamId,
    view,
    data,
  }: {
    agentId: string
    teamId: string
  } & (
    | {
        view: 'list'
        data: ConversationEvent
      }
    | {
        view: 'explorer'
        data: ConversationExplorerNodeEvent
      }
  )) {
    return this.emit({
      channel: `agents-${agentId}-conversations:team-${teamId}${view === 'explorer' ? ':explorer' : ''}`,
      data,
    })
  }
}

export const conversationPubSub = new ConversationPubSub()
