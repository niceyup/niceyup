import type { DatabaseSourceTableMetadata } from '@workspace/core/sources'
import type { VectorStore } from '@workspace/vector-store'
import { filesLoader } from './loaders'
import { documentSplitter } from './splitters'

export async function ingestTextSource({
  vectorStore,
  sourceId,
}: {
  vectorStore: VectorStore
  sourceId: string
}) {
  const documents = [{ content: 'Empty' }]

  // TODO: implement logic to ingest text source

  await vectorStore.upsert({
    collection: 'sources',
    sourceId,
    sourceType: 'text',
    data: documents,
  })
}

export async function ingestQuestionAnswerSource({
  vectorStore,
  sourceId,
}: {
  vectorStore: VectorStore
  sourceId: string
}) {
  const documents = [{ content: 'Empty' }]

  // TODO: implement logic to ingest question answer source

  await vectorStore.upsert({
    collection: 'sources',
    sourceId,
    sourceType: 'question-answer',
    data: documents,
  })
}

export async function ingestWebsiteSource({
  vectorStore,
  sourceId,
}: {
  vectorStore: VectorStore
  sourceId: string
}) {
  const documents = [{ content: 'Empty' }]

  // TODO: implement logic to ingest website source

  await vectorStore.upsert({
    collection: 'sources',
    sourceId,
    sourceType: 'website',
    data: documents,
  })
}

export async function ingestFileSource({
  vectorStore,
  sourceId,
  filePath,
  chunkSize,
  chunkOverlap,
}: {
  vectorStore: VectorStore
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
    collection: 'sources',
    sourceId,
    sourceType: 'file',
    data: documents,
  })
}

export async function ingestDatabaseSource({
  vectorStore,
  sourceId,
  tablesMetadata,
}: {
  vectorStore: VectorStore
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
    collection: 'sources',
    sourceId,
    sourceType: 'database',
    data: documents,
  })
}

// export async function ingestDatabaseSourceTablesMetadata({
//   vectorStore,
//   sourceId,
//   tablesMetadata,
// }: {
//   vectorStore: VectorStore
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
//     collection: 'database-source-tables-metadata',
//     sourceId,
//     sourceType: 'database',
//     data: documents,
//   })
// }

// export async function ingestDatabaseSourceProperNouns({
//   vectorStore,
//   sourceId,
// }: {
//   vectorStore: VectorStore
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
//     collection: 'database-source-proper-nouns',
//     sourceId,
//     sourceType: 'database',
//     data: documents,
//   })
// }

// export async function ingestDatabaseSourceQueryExamples({
//   vectorStore,
//   sourceId,
//   queryExamples,
// }: {
//   vectorStore: VectorStore
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
//   vectorStore,
//   languageModel,
//   sourceId,
//   tablesMetadata,
// }: {
//   vectorStore: VectorStore
//   languageModel: LanguageModel
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
//     collection: 'sources',
//     sourceId,
//     sourceType: 'database',
//     data: document,
//   })
// }
