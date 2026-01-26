import type { FastifyTypedInstance } from '@/types/fastify'
import { createAgent } from './agents/create-agent'
import { deleteAgent } from './agents/delete-agent'
import { getAgent } from './agents/get-agent'
import { getAgentConfiguration } from './agents/get-agent-configuration'
import { listAgents } from './agents/list-agents'
import { getSourceIndexingStatus } from './agents/source-indexes/get-source indexing-status'
import { listSourceIndexes } from './agents/source-indexes/list-source-indexes'
import { triggerSourceIndexing } from './agents/source-indexes/trigger-source-indexing'
import { updateSourceIndexes } from './agents/source-indexes/update-source-indexes'
import { updateAgent } from './agents/update-agent'
import { updateAgentConfiguration } from './agents/update-agent-configuration'
import { createConnection } from './connections/create-connection'
import { deleteConnection } from './connections/delete-connection'
import { getConnection } from './connections/get-connection'
import { listConnections } from './connections/list-connections'
import { updateConnection } from './connections/update-connection'
import { createConversation } from './conversations/create-conversation'
import { deleteConversation } from './conversations/delete-conversation'
import { generateUploadSignatureConversation } from './conversations/files/generate-upload-signature'
import { uploadFilesConversation } from './conversations/files/upload-files'
import { getConversation } from './conversations/get-conversation'
import { listConversations } from './conversations/list-conversations'
import { listMessages } from './conversations/messages/list-messages'
import { realtimeMessages } from './conversations/messages/realtime-messages'
import { regenerateMessage } from './conversations/messages/regenerate-message'
import { resendMessage } from './conversations/messages/resend-message'
import { sendMessage } from './conversations/messages/send-message'
import { stopMessage } from './conversations/messages/stop-message'
import { streamMessage } from './conversations/messages/stream-message'
import { updateConversation } from './conversations/update-conversation'
import { generateUploadSignature } from './files/generate-upload-signature'
import { getFile } from './files/get-file'
import { uploadFiles } from './files/upload-files'
import { health } from './health'
import { getProfile } from './profile/get-profile'
import { createProvider } from './providers/create-provider'
import { deleteProvider } from './providers/delete-provider'
import { getProvider } from './providers/get-provider'
import { listProviders } from './providers/list-providers'
import { createSource } from './sources/create-source'
import { createSourceFolder } from './sources/create-source-folder'
import { getDatabaseSchema } from './sources/database/get-schema'
import { deleteSource } from './sources/delete-source'
import { deleteSourceFolder } from './sources/delete-source-folder'
import { generateUploadSignatureSource } from './sources/files/generate-upload-signature'
import { uploadFilesSource } from './sources/files/upload-files'
import { getSource } from './sources/get-source'
import { listSources } from './sources/list-sources'
import { updateSource } from './sources/update-source'
import { updateSourceFolder } from './sources/update-source-folder'

export async function routes(app: FastifyTypedInstance) {
  app.register(health)
  // app.register(authRoutes)

  app.register(getProfile)

  app.register(listAgents)
  app.register(getAgent)
  app.register(createAgent)
  app.register(updateAgent)
  app.register(deleteAgent)
  app.register(getAgentConfiguration)
  app.register(updateAgentConfiguration)
  app.register(listSourceIndexes)
  app.register(updateSourceIndexes)
  app.register(getSourceIndexingStatus)
  app.register(triggerSourceIndexing)

  app.register(listConversations)
  app.register(getConversation)
  app.register(createConversation)
  app.register(updateConversation)
  app.register(deleteConversation)
  app.register(listMessages)
  app.register(realtimeMessages)
  app.register(sendMessage)
  app.register(resendMessage)
  app.register(regenerateMessage)
  app.register(streamMessage)
  app.register(stopMessage)

  app.register(listProviders)
  app.register(getProvider)
  app.register(createProvider)
  app.register(deleteProvider)

  app.register(listSources)
  app.register(getSource)
  app.register(createSource)
  app.register(updateSource)
  app.register(deleteSource)
  app.register(createSourceFolder)
  app.register(updateSourceFolder)
  app.register(deleteSourceFolder)
  app.register(getDatabaseSchema)

  app.register(listConnections)
  app.register(getConnection)
  app.register(createConnection)
  app.register(updateConnection)
  app.register(deleteConnection)

  app.register(getFile)
  app.register(generateUploadSignature)
  app.register(uploadFiles)
  app.register(generateUploadSignatureSource)
  app.register(uploadFilesSource)
  app.register(generateUploadSignatureConversation)
  app.register(uploadFilesConversation)
}
