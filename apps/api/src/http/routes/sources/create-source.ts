import { BadRequestError } from '@/http/errors/bad-request-error'
import { withDefaultErrorResponses } from '@/http/errors/default-error-responses'
import {
  createSourceExplorerNodeItem,
  getSourceExplorerNodeFolder,
} from '@/http/functions/explorer-nodes/source-explorer-nodes'
import { getMembershipContext } from '@/http/functions/membership'
import { authenticate } from '@/http/middlewares/authenticate'
import type { FastifyTypedInstance } from '@/types/fastify'
import { db } from '@workspace/db'
import { eq } from '@workspace/db/orm'
import {
  connections,
  databaseSources,
  questionAnswerSources,
  sources,
  textSources,
} from '@workspace/db/schema'
import type { runIngestionTask } from '@workspace/engine/tasks/run-ingestion'
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

const databaseSourceSchema = z.object({
  type: z.literal('database'),
  name: z.string(),
  dialect: z.enum(['postgresql', 'mysql']),
  connectionId: z.string(),
})

const sourceTypeSchema = z.intersection(
  z.object({
    type: z.enum(['text', 'question-answer', 'database']),
  }),
  z.discriminatedUnion('type', [
    textSourceSchema,
    questionAnswerSourceSchema,
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
        body: z
          .object({
            organizationId: z.string().optional(),
            organizationSlug: z.string().optional(),
          })
          .and(
            sourceTypeSchema.and(
              z.object({
                explorerNode: z
                  .object({
                    folderId: z.string().nullish(),
                  })
                  .optional(),
              }),
            ),
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
      const {
        user: { id: userId },
      } = request.authSession

      const { organizationId, organizationSlug, type, name, explorerNode } =
        request.body

      const { context } = await getMembershipContext({
        userId,
        organizationId,
        organizationSlug,
      })

      if (explorerNode?.folderId && explorerNode.folderId !== 'root') {
        const folderExplorerNode = await getSourceExplorerNodeFolder({
          id: explorerNode.folderId,
          organizationId: context.organizationId,
        })

        if (!folderExplorerNode) {
          throw new BadRequestError({
            code: 'FOLDER_IN_EXPLORER_NOT_FOUND',
            message: 'Folder in explorer not found or you don’t have access',
          })
        }
      }

      const { source, itemExplorerNode } = await db.transaction(async (tx) => {
        const [source] = await tx
          .insert(sources)
          .values({
            name,
            type,
            organizationId: context.organizationId,
          })
          .returning({
            id: sources.id,
          })

        if (!source) {
          throw new BadRequestError({
            code: 'SOURCE_NOT_CREATED',
            message: 'Source not created',
          })
        }

        if (type === 'question-answer') {
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
        } else if (type === 'database') {
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
        } else {
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
        }

        const itemExplorerNode = await createSourceExplorerNodeItem(
          {
            parentId: explorerNode?.folderId,
            sourceId: source.id,
            organizationId: context.organizationId,
          },
          tx,
        )

        if (!itemExplorerNode) {
          throw new BadRequestError({
            code: 'EXPLORER_NODE_NOT_CREATED',
            message: 'Explorer node not created',
          })
        }

        return { source, itemExplorerNode }
      })

      if (type === 'text' || type === 'question-answer') {
        await tasks.trigger<typeof runIngestionTask>('run-ingestion', {
          sourceId: source.id,
        })
      }

      return reply.status(201).send({
        sourceId: source.id,
        explorerNode: { itemId: itemExplorerNode.id },
      })
    },
  )
}
