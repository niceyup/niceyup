import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import {
  createSourceExplorerNodeItem,
  getSourceExplorerNodeFolder,
} from '@/http/functions/explorer-nodes/source-explorer-nodes'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { resolveAuthOrganizationContext } from '@workspace/auth/context'
import { billing } from '@workspace/billing'
import { db } from '@workspace/db'
import { eq } from '@workspace/db/orm'
import {
  connections,
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
  name: z.string(),
  text: z.string(),
})

const questionAnswerSourceSchema = z.object({
  type: z.literal('question-answer'),
  name: z.string(),
  questions: z.array(z.string()),
  answer: z.string(),
})

const websiteSourceSchema = z.object({
  type: z.literal('website'),
  name: z.string(),
  url: z.url(),
})

const databaseSourceSchema = z.object({
  type: z.literal('database'),
  name: z.string(),
  dialect: z.enum(['postgresql', 'mysql']),
  connectionId: z.string(),
})

const sourceTypeSchema = z.intersection(
  z.object({
    type: z.enum(['text', 'question-answer', 'website', 'database']),
  }),
  z.discriminatedUnion('type', [
    textSourceSchema,
    questionAnswerSourceSchema,
    websiteSourceSchema,
    databaseSourceSchema,
  ]),
)

export async function createSource(app: FastifyTypedInstance) {
  app.register(authenticate).post(
    '/sources',
    {
      schema: {
        tags: ['Sources'],
        description: 'Create a new source',
        operationId: 'createSource',
        headers: z.object({
          'x-organization-id': z.string().optional(),
          'x-organization-slug': z.string().optional(),
        }),
        body: sourceTypeSchema.and(
          z.object({
            explorerNode: z
              .object({
                folderId: z.string().nullish(),
              })
              .optional(),
          }),
        ),
        response: withDefaultErrorResponses({
          201: z
            .object({
              sourceId: z.string(),
              explorerNode: z.object({
                itemId: z.string(),
              }),
            })
            .describe('Success'),
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

      const { type, name, explorerNode } = request.body

      if (explorerNode?.folderId && explorerNode.folderId !== 'root') {
        const folderExplorerNode = await getSourceExplorerNodeFolder({
          id: explorerNode.folderId,
          organizationId: organization.id,
        })

        if (!folderExplorerNode) {
          throw new BadRequestError({
            code: 'FOLDER_IN_EXPLORER_NOT_FOUND',
            message: 'Folder in explorer not found or you don’t have access',
          })
        }
      }

      await billing.limits.computeUsage.throwIfExceeded({
        referenceId: organization.id,
      })

      const { source, itemExplorerNode } = await db.transaction(async (tx) => {
        const [source] = await tx
          .insert(sources)
          .values({
            name,
            type,
            status:
              type === 'text' || type === 'question-answer'
                ? 'completed'
                : 'draft',
            organizationId: organization.id,
          })
          .returning({
            id: sources.id,
            status: sources.status,
          })

        if (!source) {
          throw new BadRequestError({
            code: 'SOURCE_NOT_CREATED',
            message: 'Source not created',
          })
        }

        switch (type) {
          case 'text':
            const { text } = request.body

            const [textSource] = await tx
              .insert(textSources)
              .values({
                text,
                sourceId: source.id,
              })
              .returning({
                id: textSources.id,
              })

            if (!textSource) {
              throw new BadRequestError({
                code: 'TEXT_SOURCE_NOT_CREATED',
                message: 'Text source not created',
              })
            }
            break

          case 'question-answer':
            const { questions, answer } = request.body

            const [questionAnswerSource] = await tx
              .insert(questionAnswerSources)
              .values({
                questions,
                answer,
                sourceId: source.id,
              })
              .returning({
                id: questionAnswerSources.id,
              })

            if (!questionAnswerSource) {
              throw new BadRequestError({
                code: 'QUESTION_ANSWER_SOURCE_NOT_CREATED',
                message: 'Question answer source not created',
              })
            }
            break

          case 'website':
            const { url } = request.body

            const [websiteSource] = await tx
              .insert(websiteSources)
              .values({
                url,
                sourceId: source.id,
              })
              .returning({
                id: websiteSources.id,
              })

            if (!websiteSource) {
              throw new BadRequestError({
                code: 'WEBSITE_SOURCE_NOT_CREATED',
                message: 'Website source not created',
              })
            }
            break

          case 'database':
            const { dialect, connectionId } = request.body

            const [connection] = await tx
              .select({
                app: connections.app,
              })
              .from(connections)
              .where(eq(connections.id, connectionId))
              .limit(1)

            if (!connection) {
              throw new BadRequestError({
                code: 'CONNECTION_NOT_FOUND',
                message: 'Connection not found',
              })
            }

            if (connection.app !== 'postgresql' && connection.app !== 'mysql') {
              throw new BadRequestError({
                code: 'INVALID_CONNECTION_APP',
                message: 'Invalid connection app',
              })
            }

            const [databaseSource] = await tx
              .insert(databaseSources)
              .values({
                dialect: dialect,
                sourceId: source.id,
                connectionId,
              })
              .returning({
                id: databaseSources.id,
              })

            if (!databaseSource) {
              throw new BadRequestError({
                code: 'DATABASE_SOURCE_NOT_CREATED',
                message: 'Database source not created',
              })
            }
            break

          default:
            throw new BadRequestError({
              code: 'SOURCE_TYPE_NOT_SUPPORTED',
              message: 'Source type not supported',
            })
        }

        const itemExplorerNode = await createSourceExplorerNodeItem(
          {
            parentId: explorerNode?.folderId,
            sourceId: source.id,
            organizationId: organization.id,
          },
          tx,
        )

        if (!itemExplorerNode) {
          throw new BadRequestError({
            code: 'EXPLORER_NODE_NOT_CREATED',
            message: 'Explorer node not created',
          })
        }

        if (source.status === 'ready') {
          await tx.insert(sourceOperations).values({
            sourceId: source.id,
            type: 'ingest' as const,
            status: 'queued' as const,
          })
        }

        return { source, itemExplorerNode }
      })

      if (source.status === 'ready') {
        await tasks.trigger<IngestSourceTask>(
          'ingest-source',
          { sourceId: source.id },
          {
            concurrencyKey: organization.id,
            tags: [`organization:${organization.id}`, `source:${source.id}`],
          },
        )
      }

      return reply.status(201).send({
        sourceId: source.id,
        explorerNode: { itemId: itemExplorerNode.id },
      })
    },
  )
}
