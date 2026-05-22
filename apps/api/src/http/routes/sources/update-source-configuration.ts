import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { resolveAuthOrganizationContext } from '@workspace/auth/context'
import {
  databaseSourceQueryExampleSchema,
  databaseSourceTableMetadataSchema,
} from '@workspace/core/sources'
import { db } from '@workspace/db'
import { eq } from '@workspace/db/orm'
import { queries } from '@workspace/db/queries'
import {
  databaseSources,
  questionAnswerSources,
  sourceOperations,
  sources,
  textSources,
  websiteSources,
} from '@workspace/db/schema'
import type { IngestSourceTask } from '@workspace/engine/tasks/ingest-source'
import { tasks } from '@workspace/engine/trigger'
import { z } from 'zod'

const textSourceSchema = z.object({
  type: z.literal('text'),
  text: z.string().optional(),
})

const questionAnswerSourceSchema = z.object({
  type: z.literal('question-answer'),
  questions: z.array(z.string()).optional(),
  answer: z.string().optional(),
})

const websiteSourceSchema = z.object({
  type: z.literal('website'),
  url: z.url().optional(),
})

const fileSourceSchema = z.object({
  type: z.literal('file'),
})

const databaseSourceSchema = z.object({
  type: z.literal('database'),
  tablesMetadata: z.array(databaseSourceTableMetadataSchema).nullish(),
  queryExamples: z.array(databaseSourceQueryExampleSchema).nullish(),
})

const sourceTypeSchema = z.discriminatedUnion('type', [
  textSourceSchema,
  questionAnswerSourceSchema,
  websiteSourceSchema,
  fileSourceSchema,
  databaseSourceSchema,
])

const sourceSchema = z.union([
  textSourceSchema.omit({ type: true }),
  questionAnswerSourceSchema.omit({ type: true }),
  websiteSourceSchema.omit({ type: true }),
  fileSourceSchema.omit({ type: true }),
  databaseSourceSchema.omit({ type: true }),
])

export async function updateSourceConfiguration(app: FastifyTypedInstance) {
  app.register(authenticate).patch(
    '/sources/:sourceId/configuration',
    {
      schema: {
        tags: ['Sources'],
        description: 'Update a source configuration',
        operationId: 'updateSourceConfiguration',
        headers: z.object({
          'x-organization-id': z.string().optional(),
          'x-organization-slug': z.string().optional(),
        }),
        params: z.object({
          sourceId: z.string(),
        }),
        body: sourceSchema.and(
          z.object({
            chunkSize: z.number().nullish(),
            chunkOverlap: z.number().nullish(),
          }),
        ),
        response: withDefaultErrorResponses({
          204: z.null().describe('Success'),
        }),
      },
    },
    async (request, reply) => {
      const { organization } = await resolveAuthOrganizationContext(
        request.ctx,
        {
          membership: { role: 'admin' },
          params: request.ctxParams,
        },
      )

      const { sourceId } = request.params

      const { chunkSize, chunkOverlap, ...payload } = request.body

      const source = await queries.ctx.getSource(
        { organizationId: organization.id },
        { sourceId },
      )

      if (!source) {
        throw new BadRequestError({
          code: 'SOURCE_NOT_FOUND',
          message: 'Source not found or you don’t have access',
        })
      }

      const validatedData = sourceTypeSchema.parse({
        type: source.type,
        ...payload,
      })

      const updatedSource = await db.transaction(async (tx) => {
        const [updatedSource] = await tx
          .update(sources)
          .set({
            status:
              source.type === 'website' || source.type === 'database'
                ? 'ready'
                : undefined,
            chunkSize,
            chunkOverlap,
            contentUpdatedAt: new Date(),
          })
          .where(eq(sources.id, sourceId))
          .returning({
            id: sources.id,
            status: sources.status,
          })

        if (!updatedSource) {
          throw new BadRequestError({
            code: 'SOURCE_NOT_UPDATED',
            message: 'Source not updated',
          })
        }

        switch (validatedData.type) {
          case 'text':
            const [textSource] = await tx
              .update(textSources)
              .set({
                text: validatedData.text,
              })
              .where(eq(textSources.sourceId, sourceId))
              .returning({
                id: textSources.id,
              })

            if (!textSource) {
              throw new BadRequestError({
                code: 'TEXT_SOURCE_NOT_UPDATED',
                message: 'Text source not updated',
              })
            }
            break

          case 'question-answer':
            const [questionAnswerSource] = await tx
              .update(questionAnswerSources)
              .set({
                questions: validatedData.questions,
                answer: validatedData.answer,
              })
              .where(eq(questionAnswerSources.sourceId, sourceId))
              .returning({
                id: questionAnswerSources.id,
              })

            if (!questionAnswerSource) {
              throw new BadRequestError({
                code: 'QUESTION_ANSWER_SOURCE_NOT_UPDATED',
                message: 'Question answer source not updated',
              })
            }
            break

          case 'website':
            const [websiteSource] = await tx
              .update(websiteSources)
              .set({
                url: validatedData.url,
              })
              .where(eq(websiteSources.sourceId, sourceId))
              .returning({
                id: websiteSources.id,
              })

            if (!websiteSource) {
              throw new BadRequestError({
                code: 'WEBSITE_SOURCE_NOT_UPDATED',
                message: 'Website source not updated',
              })
            }
            break

          case 'database':
            const [databaseSource] = await tx
              .update(databaseSources)
              .set({
                tablesMetadata: validatedData.tablesMetadata,
                queryExamples: validatedData.queryExamples,
              })
              .where(eq(databaseSources.sourceId, sourceId))
              .returning({
                id: databaseSources.id,
              })

            if (!databaseSource) {
              throw new BadRequestError({
                code: 'DATABASE_SOURCE_NOT_UPDATED',
                message: 'Database source not updated',
              })
            }
            break
        }

        if (updatedSource.status === 'ready') {
          const [sourceOperation] = await tx
            .select({
              id: sourceOperations.id,
            })
            .from(sourceOperations)
            .where(eq(sourceOperations.sourceId, sourceId))
            .limit(1)

          if (sourceOperation) {
            await tx
              .update(sourceOperations)
              .set({
                type: 'ingest' as const,
                status: 'queued' as const,
              })
              .where(eq(sourceOperations.sourceId, sourceId))
          } else {
            await tx.insert(sourceOperations).values({
              sourceId,
              type: 'ingest' as const,
              status: 'queued' as const,
            })
          }
        }

        return updatedSource
      })

      if (updatedSource.status === 'ready') {
        await tasks.trigger<IngestSourceTask>(
          'ingest-source',
          { sourceId },
          {
            concurrencyKey: organization.id,
            tags: [`organization:${organization.id}`, `source:${sourceId}`],
          },
        )
      }

      return reply.status(204).send()
    },
  )
}
