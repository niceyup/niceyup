import type { EmbeddingModel } from '@workspace/ai'
import type { DatabaseSourceTableMetadata } from '@workspace/core/sources'
import { vectorStore } from '@workspace/vector-store'
import { filesLoader } from './loaders'
import { documentSplitter } from './splitters'

export async function ingestTextSource({
  embeddingModel,
  organizationId,
  agentId,
  sourceId,
}: {
  embeddingModel: EmbeddingModel
  organizationId: string
  agentId: string
  sourceId: string
}) {
  const documents = [{ content: 'Empty' }]

  // TODO: implement logic to ingest text source

  await vectorStore.upsert({
    embeddingModel,
    namespace: organizationId,
    collection: 'sources',
    agentId,
    sourceId,
    sourceType: 'text',
    data: documents,
  })
}

export async function ingestQuestionAnswerSource({
  embeddingModel,
  organizationId,
  agentId,
  sourceId,
}: {
  embeddingModel: EmbeddingModel
  organizationId: string
  agentId: string
  sourceId: string
}) {
  const documents = [{ content: 'Empty' }]

  // TODO: implement logic to ingest question answer source

  await vectorStore.upsert({
    embeddingModel,
    namespace: organizationId,
    collection: 'sources',
    agentId,
    sourceId,
    sourceType: 'question-answer',
    data: documents,
  })
}

export async function ingestWebsiteSource({
  embeddingModel,
  organizationId,
  agentId,
  sourceId,
}: {
  embeddingModel: EmbeddingModel
  organizationId: string
  agentId: string
  sourceId: string
}) {
  const documents = [{ content: 'Empty' }]

  // TODO: implement logic to ingest website source

  await vectorStore.upsert({
    embeddingModel,
    namespace: organizationId,
    collection: 'sources',
    agentId,
    sourceId,
    sourceType: 'website',
    data: documents,
  })
}

export async function ingestFileSource({
  embeddingModel,
  organizationId,
  agentId,
  sourceId,
  filePath,
  chunkSize,
  chunkOverlap,
}: {
  embeddingModel: EmbeddingModel
  organizationId: string
  agentId: string
  sourceId: string
  filePath: string
  chunkSize: number | null
  chunkOverlap: number | null
}) {
  const loadedDocuments = await filesLoader({ paths: [filePath] })

  const splitDocuments = await documentSplitter({
    documents: loadedDocuments,
    chunkSize,
    chunkOverlap,
  })

  const documents = splitDocuments.map((document) => ({
    content: document.pageContent,
    metadata: {
      documentMetadata: document.metadata,
    },
  }))

  await vectorStore.upsert({
    embeddingModel,
    namespace: organizationId,
    collection: 'sources',
    agentId,
    sourceId,
    sourceType: 'file',
    data: documents,
  })
}

export async function ingestDatabaseSource({
  embeddingModel,
  organizationId,
  agentId,
  sourceId,
  tablesMetadata,
}: {
  embeddingModel: EmbeddingModel
  organizationId: string
  agentId: string
  sourceId: string
  tablesMetadata: DatabaseSourceTableMetadata[]
}) {
  const documents = []

  for (const table of tablesMetadata) {
    let content = table.name

    if (table.meta?.description) {
      content += `\n${table.meta.description}`
    }

    content += '\n'

    for (const column of table.columns) {
      content += `-\n${column.name}`

      if (column.meta?.description) {
        content += `\n${column.meta.description}`
      }

      content += '\n'
    }

    documents.push({ content })
  }

  await vectorStore.upsert({
    embeddingModel,
    namespace: organizationId,
    collection: 'sources',
    agentId,
    sourceId,
    sourceType: 'database',
    data: documents,
  })
}

// export async function ingestDatabaseSourceTablesMetadata({
//   embeddingModel,
//   organizationId,
//   sourceId,
//   tablesMetadata,
// }: {
//   embeddingModel: EmbeddingModel
//   organizationId: string
//   sourceId: string
//   tablesMetadata: DatabaseSourceTableMetadata[]
// }) {
//   const documents = []

//   for (const table of tablesMetadata) {
//     let content = `Table: "${table.name}"\n`

//     if (table.meta?.description) {
//       content += `Description: ${table.meta.description}\n`
//     }

//     content += 'Columns:\n'

//     for (const column of table.columns) {
//       content += `-\n"${column.name}"`

//       if (column.foreign_table && column.foreign_column) {
//         content += ` relations "${column.foreign_table}"."${column.foreign_column}"`
//       }

//       if (column.meta?.description) {
//         content += `\nDescription: ${column.meta.description}`
//       }

//       content += '\n'
//     }

//     documents.push({
//       content,
//       metadata: { tableMetadata: table },
//     })
//   }

//   await vectorStore.upsert({
//     embeddingModel,
//     namespace: organizationId,
//     collection: 'database-source-tables-metadata',
//     sourceId,
//     sourceType: 'database',
//     data: documents,
//   })
// }

// export async function ingestDatabaseSourceProperNouns({
//   embeddingModel,
//   organizationId,
//   sourceId,
// }: {
//   embeddingModel: EmbeddingModel
//   organizationId: string
//   sourceId: string
// }) {
//   const properNouns = await getDbProperNounsTask
//     .triggerAndWait({ sourceId })
//     .unwrap()

//   const documents = []

//   for (const table of properNouns) {
//     for (const column of table.columns) {
//       for (const properNoun of column.proper_nouns) {
//         documents.push({
//           content: properNoun,
//           metadata: { key: `"${table.name}"."${column.name}"` },
//         })
//       }
//     }
//   }

//   await vectorStore.upsert({
//     embeddingModel,
//     namespace: organizationId,
//     collection: 'database-source-proper-nouns',
//     sourceId,
//     sourceType: 'database',
//     data: documents,
//   })
// }

// export async function ingestDatabaseSourceQueryExamples({
//   embeddingModel,
//   organizationId,
//   sourceId,
//   queryExamples,
// }: {
//   embeddingModel: EmbeddingModel
//   organizationId: string
//   sourceId: string
//   queryExamples: DatabaseSourceQueryExample[]
// }) {
//   const documents = []

//   if (queryExamples) {
//     for (const queryExample of queryExamples) {
//       const content = `Input: \`${queryExample.input}\`\nQuery: \`${queryExample.query}\``

//       documents.push({ content })
//     }
//   }

//   await vectorStore.upsert({
//     embeddingModel,
//     namespace: organizationId,
//     collection: 'database-source-query-examples',
//     sourceId,
//     sourceType: 'database',
//     data: documents,
//   })
// }

// /**
//  * Experimental. Do not use this function in production. Use {@link ingestDatabaseSource} instead.
//  */
// export async function experimental_ingestDatabaseSource({
//   embeddingModel,
//   languageModel,
//   organizationId,
//   sourceId,
//   tablesMetadata,
// }: {
//   embeddingModel: EmbeddingModel
//   languageModel: LanguageModel
//   organizationId: string
//   sourceId: string
//   tablesMetadata: DatabaseSourceTableMetadata[]
// }) {
//   const tablesContent = []

//   for (const table of tablesMetadata) {
//     let content = table.name

//     if (table.meta?.description) {
//       content += `\n${table.meta.description}`
//     }

//     content += '\n'

//     for (const column of table.columns) {
//       content += `-\n${column.name}`

//       if (column.meta?.description) {
//         content += `\n${column.meta.description}`
//       }

//       content += '\n'
//     }

//     tablesContent.push(content)
//   }

//   const generatedContent = await generateText({
//     model: languageModel,
//     messages: experimental_templatePromptSummarizeDatabaseSource({
//       content: tablesContent.join('\n-\n'),
//     }),
//   })

//   const document = { content: generatedContent.text }

//   await vectorStore.upsert({
//     embeddingModel,
//     namespace: organizationId,
//     collection: 'sources',
//     sourceId,
//     sourceType: 'database',
//     data: document,
//   })
// }
