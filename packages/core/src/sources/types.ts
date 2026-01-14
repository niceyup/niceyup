import type { z } from 'zod'
import type {
  databaseSourceColumnMetadataSchema,
  databaseSourceDialectSchema,
  databaseSourceQueryExampleSchema,
  databaseSourceTableMetadataSchema,
  sourceEmbeddingStatusSchema,
  sourceTypeSchema,
} from './schemas'

export type SourceType = z.infer<typeof sourceTypeSchema>

export type SourceEmbeddingStatus = z.infer<typeof sourceEmbeddingStatusSchema>

export type DatabaseSourceDialect = z.infer<typeof databaseSourceDialectSchema>

export type DatabaseSourceColumnMetadata = z.infer<
  typeof databaseSourceColumnMetadataSchema
>

export type DatabaseSourceTableMetadata = z.infer<
  typeof databaseSourceTableMetadataSchema
>

export type DatabaseSourceQueryExample = z.infer<
  typeof databaseSourceQueryExampleSchema
>
