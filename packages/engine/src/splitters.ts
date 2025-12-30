import type { Document } from '@langchain/core/documents'
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'

export async function documentSplitter({
  documents,
  chunkSize,
  chunkOverlap,
}: {
  documents: Document[]
  chunkSize: number | null
  chunkOverlap: number | null
}) {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: chunkSize ?? undefined,
    chunkOverlap: chunkOverlap ?? undefined,
  })

  const splitDocuments = await splitter.splitDocuments(documents)

  return splitDocuments
}
