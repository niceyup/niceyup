import { z } from 'zod'

export const sourceTypeSchema = z.enum([
  'text',
  'question-answer',
  'website',
  'file',
  'database',
])

export const sourceStatusSchema = z.enum(['draft', 'ready', 'completed'])

export const sourceIndexStatusSchema = z.enum(['idle', 'completed'])

export const databaseSourceDialectSchema = z.enum([
  'postgresql',
  'mysql',
  'sqlite',
])

export const databaseSourceColumnMetadataSchema = z.object({
  name: z.string(),
  meta: z
    .object({
      description: z.string().optional(),
      properNoun: z.boolean().optional(),
    })
    .optional(),
  data_type: z.string(),
  foreign_table: z.string().optional(),
  foreign_column: z.string().optional(),
})

export const databaseSourceTableMetadataSchema = z.object({
  name: z.string(),
  meta: z
    .object({
      description: z.string().optional(),
    })
    .optional(),
  columns: z.array(databaseSourceColumnMetadataSchema),
})

export const databaseSourceQueryExampleSchema = z.object({
  input: z.string(),
  query: z.string(),
})

// Source Operations

export const sourceOperationTypeSchema = z.enum([
  'ingest',
  'ingest-delete',
  'index',
  'index-delete',
])

export const sourceOperationStatusSchema = z.enum([
  'queued',
  'processing',
  'completed',
  'failed',
])
