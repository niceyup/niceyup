import type { FastifyTypedInstance } from '@/types/fastify'
import { getAgentConfiguration } from './agents/configuration/get-agent-configuration'
import { updateAgentConfiguration } from './agents/configuration/update-agent-configuration'
import { createAgent } from './agents/create-agent'
import { deleteAgent } from './agents/delete-agent'
import { getAgent } from './agents/get-agent'
import { getAgentKnowledgeBase } from './agents/knowledge-base/get-agent-knowledge-base'
import { getSourceIndexingStatus } from './agents/knowledge-base/indexed-sources/get-source-indexing-status'
import { listIndexedSources } from './agents/knowledge-base/indexed-sources/list-indexed-sources'
import { triggerSourceIndexing } from './agents/knowledge-base/indexed-sources/trigger-source-indexing'
import { updateIndexedSources } from './agents/knowledge-base/indexed-sources/update-indexed-sources'
import { reindexKnowledgeBase } from './agents/knowledge-base/reindex-knowledge-base'
import { updateAgentKnowledgeBase } from './agents/knowledge-base/update-agent-knowledge-base'
import { listAgents } from './agents/list-agents'
import { getAgentSystemConfiguration } from './agents/system-configuration/get-agent-system-configuration'
import { updateAgentSystemConfiguration } from './agents/system-configuration/update-agent-system-configuration'
import { updateAgent } from './agents/update-agent'
import { createConnection } from './connections/create-connection'
import { deleteConnection } from './connections/delete-connection'
import { getConnection } from './connections/get-connection'
import { listConnections } from './connections/list-connections'
import { updateConnection } from './connections/update-connection'
import { getConversationConfiguration } from './conversations/configuration/get-conversation-configuration'
import { updateConversationConfiguration } from './conversations/configuration/update-conversation-configuration'
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
import { respondToToolApproval } from './conversations/messages/respond-to-tool-approval'
import { sendMessage } from './conversations/messages/send-message'
import { stopMessage } from './conversations/messages/stop-message'
import { streamMessage } from './conversations/messages/stream-message'
import { realtimeConversations } from './conversations/realtime-conversations'
import { updateConversation } from './conversations/update-conversation'
import { generateUploadSignature } from './files/generate-upload-signature'
import { getFile } from './files/get-file'
import { uploadFiles } from './files/upload-files'
import { health } from './health'
import { createMcpServer } from './mcp-servers/create-mcp-server'
import { deleteMcpServer } from './mcp-servers/delete-mcp-server'
import { getMcpServer } from './mcp-servers/get-mcp-server'
import { listMcpServers } from './mcp-servers/list-mcp-servers'
import { updateMcpServer } from './mcp-servers/update-mcp-server'
import { createModelProvider } from './model-providers/create-model-provider'
import { deleteModelProvider } from './model-providers/delete-model-provider'
import { getModelProvider } from './model-providers/get-model-provider'
import { listModelProviders } from './model-providers/list-model-providers'
import { updateModelProvider } from './model-providers/update-model-provider'
import { getProfile } from './profile/get-profile'
import { listModelProviderSelectOptions } from './select-option/list-model-provider-select-options'
import { listVectorStoreSelectOptions } from './select-option/list-vector-store-select-options'
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
import { createVectorStore } from './vector-stores/create-vector-store'
import { deleteVectorStore } from './vector-stores/delete-vector-store'
import { getVectorStore } from './vector-stores/get-vector-store'
import { listVectorStores } from './vector-stores/list-vector-stores'
import { updateVectorStore } from './vector-stores/update-vector-store'

export async function routes(app: FastifyTypedInstance) {
  app.register(health)
  // app.register(authRoutes)

  app.register(getProfile)

  app.register(listModelProviders)
  app.register(createModelProvider)
  app.register(getModelProvider)
  app.register(updateModelProvider)
  app.register(deleteModelProvider)
  app.register(listModelProviderSelectOptions)

  app.register(listVectorStores)
  app.register(createVectorStore)
  app.register(getVectorStore)
  app.register(updateVectorStore)
  app.register(deleteVectorStore)
  app.register(listVectorStoreSelectOptions)

  app.register(listConnections)
  app.register(createConnection)
  app.register(getConnection)
  app.register(updateConnection)
  app.register(deleteConnection)

  app.register(listMcpServers)
  app.register(createMcpServer)
  app.register(getMcpServer)
  app.register(updateMcpServer)
  app.register(deleteMcpServer)

  app.register(listAgents)
  app.register(createAgent)
  app.register(getAgent)
  app.register(updateAgent)
  app.register(deleteAgent)

  app.register(getAgentSystemConfiguration)
  app.register(updateAgentSystemConfiguration)

  app.register(getAgentConfiguration)
  app.register(updateAgentConfiguration)

  app.register(listConversations)
  app.register(createConversation)
  app.register(getConversation)
  app.register(updateConversation)
  app.register(deleteConversation)

  app.register(getConversationConfiguration)
  app.register(updateConversationConfiguration)

  app.register(listMessages)
  app.register(sendMessage)
  app.register(resendMessage)
  app.register(regenerateMessage)
  app.register(respondToToolApproval)
  app.register(streamMessage)
  app.register(stopMessage)

  app.register(getAgentKnowledgeBase)
  app.register(updateAgentKnowledgeBase)
  app.register(reindexKnowledgeBase)

  app.register(listIndexedSources)
  app.register(updateIndexedSources)
  app.register(getSourceIndexingStatus)
  app.register(triggerSourceIndexing)

  app.register(listSources)
  app.register(getSource)
  app.register(createSource)
  app.register(updateSource)
  app.register(deleteSource)
  app.register(createSourceFolder)
  app.register(updateSourceFolder)
  app.register(deleteSourceFolder)
  app.register(getDatabaseSchema)

  app.register(getFile)
  app.register(generateUploadSignature)
  app.register(uploadFiles)
  app.register(generateUploadSignatureConversation)
  app.register(uploadFilesConversation)
  app.register(generateUploadSignatureSource)
  app.register(uploadFilesSource)

  // Websocket routes
  app.register(realtimeConversations)
  app.register(realtimeMessages)
}
