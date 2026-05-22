export type Collection =
  | 'sources'
  | 'database-source-tables-metadata'
  | 'database-source-proper-nouns'
  | 'database-source-query-examples'

export type SourcesDocument = {
  content: string
  metadata?: {
    documentMetadata?: Record<string, any>
  }
}

export type SingleOrMultiple<T> = T | T[]
