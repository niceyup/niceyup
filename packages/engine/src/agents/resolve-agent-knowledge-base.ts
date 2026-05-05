import type { EmbeddingModel } from '@workspace/ai'
import { db } from '@workspace/db'
import { eq } from '@workspace/db/orm'
import { queries } from '@workspace/db/queries'
import { knowledgeBases } from '@workspace/db/schema'
import { agentToolkit } from '../agent-toolkit'
import { resolveEmbeddingModelSettings } from './resolve-model-settings'
import { resolveVectorStore } from './resolve-vector-store'
import {
  safeValidateKnowledgeBaseConfiguration,
  validateKnowledgeBaseConfiguration,
} from './validate-knowledge-base-configuration'

export type AgentKnowledgeBase = Awaited<
  ReturnType<typeof resolveAgentKnowledgeBase>
>

export async function resolveAgentKnowledgeBase(params: {
  agentId: string
}) {
  const [agentKnowledgeBase] = await db
    .select({
      id: knowledgeBases.id,
      status: knowledgeBases.status,
      vectorStoreId: knowledgeBases.vectorStoreId,
      embeddingModelSettingsId: knowledgeBases.embeddingModelSettingsId,
      topK: knowledgeBases.topK,
      agentId: knowledgeBases.agentId,
      organizationId: knowledgeBases.organizationId,
    })
    .from(knowledgeBases)
    .where(eq(knowledgeBases.agentId, params.agentId))
    .limit(1)

  if (!agentKnowledgeBase) {
    return null
  }

  const vectorStoreId = agentKnowledgeBase.vectorStoreId ?? null

  const embeddingModelSettingsId =
    agentKnowledgeBase.embeddingModelSettingsId ?? null

  const topK = agentKnowledgeBase.topK ?? null

  const vectorStore = async () => {
    if (!vectorStoreId) {
      return null
    }

    return await queries.getVectorStore({
      vectorStoreId,
    })
  }

  const createVectorStore = async (params: {
    embeddingModel: EmbeddingModel
  }) => {
    const createVectorStore = await resolveVectorStore({
      vectorStoreId,
    })

    return createVectorStore({
      namespace: agentKnowledgeBase.id,
      embeddingModel: params.embeddingModel,
    })
  }

  const embeddingModelSettings = async () => {
    if (!embeddingModelSettingsId) {
      return null
    }

    return await queries.getModelSettings({
      type: 'embedding-model',
      modelSettingsId: embeddingModelSettingsId,
    })
  }

  const embeddingModel = async () => {
    return await resolveEmbeddingModelSettings({
      modelSettingsId: embeddingModelSettingsId,
    })
  }

  const knowledgeBaseTool = async () => {
    const { vectorStore } =
      await validateKnowledgeBaseConfiguration(agentKnowledgeBase)

    return agentToolkit.knowledgeBaseTool({
      vectorStore,
      topK: topK ?? undefined,
    })
  }

  const safeValidateConfiguration = async () => {
    return await safeValidateKnowledgeBaseConfiguration(agentKnowledgeBase)
  }

  return {
    id: agentKnowledgeBase.id,
    status: agentKnowledgeBase.status,
    vectorStoreId,
    embeddingModelSettingsId,
    topK,
    vectorStore,
    createVectorStore,
    embeddingModelSettings,
    embeddingModel,
    knowledgeBaseTool,
    safeValidateConfiguration,
  }
}
