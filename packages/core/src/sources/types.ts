import type { z } from 'zod'
import type {
  databaseSourceColumnMetadataSchema,
  databaseSourceDialectSchema,
  databaseSourceQueryExampleSchema,
  databaseSourceTableMetadataSchema,
  sourceIndexStatusSchema,
  sourceOperationStatusSchema,
  sourceOperationTypeSchema,
  sourceStatusSchema,
  sourceTypeSchema,
} from './schemas'

export type SourceType = z.infer<typeof sourceTypeSchema>

export type SourceStatus = z.infer<typeof sourceStatusSchema>

export type SourceIndexStatus = z.infer<typeof sourceIndexStatusSchema>

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

// Source Operations

export type SourceOperationType = z.infer<typeof sourceOperationTypeSchema>

export type SourceOperationStatus = z.infer<typeof sourceOperationStatusSchema>
