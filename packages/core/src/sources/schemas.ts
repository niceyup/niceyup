import { z } from 'zod'

export const sourceTypeSchema = z.enum([
  'text',
  'question-answer',
  'website',
  'file',
  'database',
])

export const sourceStatusSchema = z.enum(['draft', 'ready', 'completed'])

export const indexedSourceStatusSchema = z.enum(['idle', 'completed'])

export const sourceFileTypeSchema = z.enum(['unstructured', 'database'])

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
  dataType: z.string(),
  foreignTable: z.string().optional(),
  foreignColumn: z.string().optional(),
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

// Source Explorer Nodes

export const sourceExplorerNodeTypeSchema = z.enum(['folder', 'source'])

export const sourceExplorerNodeFlagSchema = z.enum(['external'])
