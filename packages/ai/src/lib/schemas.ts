import { z } from 'zod'

// Ref: https://github.com/vercel/ai/blob/7fcc6be82612e9fceff59ffda2fd004657ff4c1b/packages/ai/src/ui/validate-ui-messages.ts

const providerMetadataSchema = z.record(z.string(), z.unknown())

const textAIPartSchema = z.object({
  type: z.literal('text'),
  text: z.string(),
  state: z.enum(['streaming', 'done']).optional(),
  providerMetadata: providerMetadataSchema.optional(),
})

const reasoningAIPartSchema = z.object({
  type: z.literal('reasoning'),
  text: z.string(),
  state: z.enum(['streaming', 'done']).optional(),
  providerMetadata: providerMetadataSchema.optional(),
})

const sourceUrlAIPartSchema = z.object({
  type: z.literal('source-url'),
  sourceId: z.string(),
  url: z.string(),
  title: z.string().optional(),
  providerMetadata: providerMetadataSchema.optional(),
})

const sourceDocumentAIPartSchema = z.object({
  type: z.literal('source-document'),
  sourceId: z.string(),
  mediaType: z.string(),
  title: z.string(),
  filename: z.string().optional(),
  providerMetadata: providerMetadataSchema.optional(),
})

const fileAIPartSchema = z.object({
  type: z.literal('file'),
  mediaType: z.string(),
  filename: z.string().optional(),
  url: z.string(),
  providerMetadata: providerMetadataSchema.optional(),
})

const stepStartAIPartSchema = z.object({
  type: z.literal('step-start'),
})

const dataAIPartSchema = z.object({
  type: z.string().startsWith('data-'),
  id: z.string().optional(),
  data: z.unknown(),
})

const dynamicToolAIPartSchemas = [
  z.object({
    type: z.literal('dynamic-tool'),
    toolName: z.string(),
    toolCallId: z.string(),
    state: z.literal('input-streaming'),
    input: z.unknown().optional(),
    output: z.never().optional(),
    errorText: z.never().optional(),
  }),
  z.object({
    type: z.literal('dynamic-tool'),
    toolName: z.string(),
    toolCallId: z.string(),
    state: z.literal('input-available'),
    input: z.unknown(),
    output: z.never().optional(),
    errorText: z.never().optional(),
    callProviderMetadata: providerMetadataSchema.optional(),
  }),
  z.object({
    type: z.literal('dynamic-tool'),
    toolName: z.string(),
    toolCallId: z.string(),
    state: z.literal('output-available'),
    input: z.unknown(),
    output: z.unknown(),
    errorText: z.never().optional(),
    callProviderMetadata: providerMetadataSchema.optional(),
    preliminary: z.boolean().optional(),
  }),
  z.object({
    type: z.literal('dynamic-tool'),
    toolName: z.string(),
    toolCallId: z.string(),
    state: z.literal('output-error'),
    input: z.unknown(),
    output: z.never().optional(),
    errorText: z.string(),
    callProviderMetadata: providerMetadataSchema.optional(),
  }),
]

const toolAIPartSchemas = [
  z.object({
    type: z.string().startsWith('tool-'),
    toolCallId: z.string(),
    state: z.literal('input-streaming'),
    input: z.unknown().optional(),
    output: z.never().optional(),
    errorText: z.never().optional(),
  }),
  z.object({
    type: z.string().startsWith('tool-'),
    toolCallId: z.string(),
    state: z.literal('input-available'),
    input: z.unknown(),
    output: z.never().optional(),
    errorText: z.never().optional(),
    callProviderMetadata: providerMetadataSchema.optional(),
  }),
  z.object({
    type: z.string().startsWith('tool-'),
    toolCallId: z.string(),
    state: z.literal('output-available'),
    input: z.unknown(),
    output: z.unknown(),
    errorText: z.never().optional(),
    callProviderMetadata: providerMetadataSchema.optional(),
    preliminary: z.boolean().optional(),
  }),
  z.object({
    type: z.string().startsWith('tool-'),
    toolCallId: z.string(),
    state: z.literal('output-error'),
    input: z.unknown(),
    output: z.never().optional(),
    errorText: z.string(),
    callProviderMetadata: providerMetadataSchema.optional(),
  }),
]

const aiMessageStatusSchema = z.enum([
  'queued',
  'processing',
  'finished',
  'stopped',
  'failed',
])

const aiMessageRoleSchema = z.enum(['system', 'user', 'assistant'])

const aiMessagePartSchema = z.union([
  textAIPartSchema,
  reasoningAIPartSchema,
  sourceUrlAIPartSchema,
  sourceDocumentAIPartSchema,
  fileAIPartSchema,
  stepStartAIPartSchema,
  dataAIPartSchema,
  ...dynamicToolAIPartSchemas,
  ...toolAIPartSchemas,
])

const aiMessageMetadataSchema = z.unknown()

const aiMessageSchema = z.object({
  id: z.string(),
  status: aiMessageStatusSchema,
  role: aiMessageRoleSchema,
  parts: z.array(aiMessagePartSchema),
  metadata: aiMessageMetadataSchema.optional(),
})

export {
  textAIPartSchema,
  reasoningAIPartSchema,
  sourceUrlAIPartSchema,
  sourceDocumentAIPartSchema,
  fileAIPartSchema,
  stepStartAIPartSchema,
  dataAIPartSchema,
  dynamicToolAIPartSchemas,
  toolAIPartSchemas,
  aiMessageStatusSchema,
  aiMessageRoleSchema,
  aiMessagePartSchema,
  aiMessageMetadataSchema,
  aiMessageSchema,
}
