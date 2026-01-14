import type { EmbeddingModel } from '@workspace/ai'
import { vectorStore } from '@workspace/vector-store'

export async function retrieveSources({
  embeddingModel,
  agentId,
  organizationId,
  question,
  topK,
}: {
  embeddingModel: EmbeddingModel
  agentId: string
  organizationId: string
  question: string
  topK?: number
}) {
  const documents = await vectorStore.query({
    embeddingModel,
    namespace: organizationId,
    collection: 'sources',
    agentId,
    query: question,
    topK,
  })

  return documents.map(
    (source) =>
      `<source id="${source.sourceId}" type="${source.sourceType}">${source.data.content}</source>`,
  )

  // const sources = []

  // const uniqueDatabaseSources = new Map<string, (typeof documents)[number]>()

  // for (const source of documents) {
  //   if (source.sourceType === 'database') {
  //     if (!uniqueDatabaseSources.has(source.sourceId)) {
  //       uniqueDatabaseSources.set(source.sourceId, source)
  //     }
  //   } else {
  //     sources.push(source)
  //   }
  // }

  // const databaseSources = Array.from(uniqueDatabaseSources.values())

  // const databaseSourcesContent = await Promise.all(
  //   databaseSources.map(async (source) => {
  //     const structuredContent = await retrieveDatabaseSourceTablesMetadata({
  //       organizationId,
  //       question,
  //       sourceId: source.sourceId,
  //     })

  //     return `<source id="${source.sourceId}" type="database">${structuredContent}</source>`
  //   }),
  // )

  // const sourcesContent = sources.map(
  //   (source) =>
  //     `<source id="${source.sourceId}" type="${source.sourceType}">${source.data.content}</source>`,
  // )

  // sourcesContent.push(...databaseSourcesContent)

  // return sourcesContent
}

// export async function retrieveDatabaseSourceTablesMetadata({
//   embeddingModel,
//   languageModel,
//   organizationId,
//   question,
//   sourceId,
// }: {
//   embeddingModel: EmbeddingModel
//   languageModel: LanguageModel
//   organizationId: string
//   question: string
//   sourceId: string
// }) {
//   const [relevantTablesMetadata, relevantQueryExamples] = await Promise.all([
//     vectorStore.query({
//       embeddingModel,
//       namespace: organizationId,
//       collection: 'database-source-tables-metadata',
//       sourceId,
//       query: question,
//       topK: 10,
//     }),

//     vectorStore.query({
//       embeddingModel,
//       namespace: organizationId,
//       collection: 'database-source-query-examples',
//       sourceId,
//       query: question,
//       topK: 10,
//     }),
//   ])

//   const tablesMetadata = relevantTablesMetadata.map(
//     (t) => t.data.metadata.tableMetadata,
//   )

//   const tables = tablesMetadata.map((t) => t.name)

//   const schema = createSchemaDDL(tablesMetadata)

//   const queryExamples = relevantQueryExamples
//     .map((q) => q.data.content)
//     .join('\n')

//   const generatedQuery = await generateText({
//     model: languageModel,
//     messages: templatePromptWriteQuery({ schema, queryExamples, question }),
//   })

//   const generatedEnhancedQuery = await generateText({
//     model: languageModel,
//     tools: {
//       searchProperNouns: searchProperNounsTool({ organizationId, sourceId }),
//     },
//     stopWhen: stepCountIs(50),
//     output: Output.object({
//       schema: z.object({
//         query: z.string().describe('Query to get the data.'),
//         properNouns: z.string().describe('Proper nouns replaced in the query.'),
//       }),
//     }),
//     messages: templatePromptQueryEnhancementWithProperNouns({
//       query: generatedQuery.text,
//     }),
//   })

//   const handle = await tasks.triggerAndWait<typeof executeQueryDbTask>(
//     'execute-query-db',
//     {
//       sourceId,
//       query: generatedEnhancedQuery.output.query,
//       tableNames: tables,
//     },
//   )

//   return handle.ok ? handle.output.result : ''
// }

// export async function retrieveDatabaseSourceProperNouns({
//   embeddingModel,
//   organizationId,
//   sourceId,
//   tableName,
//   columnName,
//   search,
// }: {
//   embeddingModel: EmbeddingModel
//   organizationId: string
//   sourceId: string
//   tableName: string
//   columnName: string
//   search: string
// }) {
//   const key = `"${tableName}"."${columnName}"`

//   const relevantProperNouns = await vectorStore.query({
//     embeddingModel,
//     namespace: organizationId,
//     collection: 'database-source-proper-nouns',
//     sourceId,
//     query: search,
//     filter: `key = '${key}'`,
//     topK: 10,
//   })

//   const properNouns = relevantProperNouns.map((p) => p.data.content)

//   return properNouns
// }
