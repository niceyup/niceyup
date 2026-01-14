import { AbortTaskRunError, schemaTask } from '@trigger.dev/sdk'
import { db } from '@workspace/db'
import { eq } from '@workspace/db/orm'
import { sources } from '@workspace/db/schema'
import { z } from 'zod'

export type CreateIngestionSourceTask = typeof createIngestionSourceTask

export const createIngestionSourceTask = schemaTask({
  id: 'create-ingestion-source',
  schema: z.object({
    sourceId: z.string(),
  }),
  run: async (payload) => {
    const [source] = await db
      .select({
        id: sources.id,
        type: sources.type,
      })
      .from(sources)
      .where(eq(sources.id, payload.sourceId))
      .limit(1)

    if (!source) {
      throw new AbortTaskRunError('Source not found')
    }

    // TODO: implement logic to create ingestion source

    return {
      status: 'success',
      message: 'Ingestion source created successfully',
    }
  },
})
