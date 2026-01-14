import { type EmbeddingModel, tool } from '@workspace/ai'
import { z } from 'zod'
import { retrieveSources } from './retrievers'

export function retrieveSourcesTool({
  embeddingModel,
  agentId,
  organizationId,
  topK,
}: {
  embeddingModel: EmbeddingModel
  agentId: string
  organizationId: string
  topK?: number
}) {
  return tool({
    description:
      'Retrieve sources from your knowledge base to answer the user’s question.',
    inputSchema: z.object({
      question: z.string().describe('The user’s question.'),
    }),
    execute: async ({ question }) => {
      return retrieveSources({
        embeddingModel,
        agentId,
        organizationId,
        question,
        topK,
      })
    },
  })
}

// export function searchProperNounsTool({
//   embeddingModel,
//   organizationId,
//   sourceId,
// }: {
//   embeddingModel: EmbeddingModel
//   organizationId: string
//   sourceId: string
// }) {
//   return tool({
//     description: 'Search for proper nouns in the knowledge base.',
//     inputSchema: z.object({
//       tableName: z.string().describe('The name of the table.'),
//       columnName: z.string().describe('The name of the column.'),
//       search: z.string().describe('The search query.'),
//     }),
//     execute: async ({ tableName, columnName, search }) => {
//       return retrieveDatabaseSourceProperNouns({
//         embeddingModel,
//         organizationId,
//         sourceId,
//         tableName,
//         columnName,
//         search,
//       })
//     },
//   })
// }
