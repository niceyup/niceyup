import type { VectorStore } from '@workspace/vector-store'

export async function retrieveSources({
  vectorStore,
  topK,
  question,
}: {
  vectorStore: VectorStore
  topK?: number
  question: string
}) {
  const documents = await vectorStore.query({
    collection: 'sources',
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
  //       vectorStore,
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
//   vectorStore,
//   languageModel,
//   question,
//   sourceId,
// }: {
//   vectorStore: VectorStore
//   languageModel: LanguageModel
//   question: string
//   sourceId: string
// }) {
//   const [relevantTablesMetadata, relevantQueryExamples] = await Promise.all([
//     vectorStore.query({
//       collection: 'database-source-tables-metadata',
//       sourceId,
//       query: question,
//       topK: 10,
//     }),

//     vectorStore.query({
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

//   const { result } = await executeQueryDbTask
//     .triggerAndWait({
//       sourceId,
//       query: generatedEnhancedQuery.output.query,
//       tableNames: tables,
//     })
//     .unwrap()

//   return result || ''
// }

// export async function retrieveDatabaseSourceProperNouns({
//   vectorStore,
//   sourceId,
//   tableName,
//   columnName,
//   search,
// }: {
//   vectorStore: VectorStore
//   sourceId: string
//   tableName: string
//   columnName: string
//   search: string
// }) {
//   const key = `"${tableName}"."${columnName}"`

//   const relevantProperNouns = await vectorStore.query({
//     collection: 'database-source-proper-nouns',
//     sourceId,
//     query: search,
//     filter: `key = '${key}'`,
//     topK: 10,
//   })

//   const properNouns = relevantProperNouns.map((p) => p.data.content)

//   return properNouns
// }
