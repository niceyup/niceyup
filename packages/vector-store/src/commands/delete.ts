import { index } from '../upstash-vector'

type DeleteParams = {
  namespace: string
} & (
  | {
      agentId: string
      sourceId: string
    }
  | {
      agentId: string
      sourceId?: string
    }
  | {
      agentId?: string
      sourceId: string
    }
)
export async function del(params: DeleteParams) {
  let filter = ''

  if (params.agentId) {
    filter += `__meta.agentId = '${params.agentId}'`
  }

  if (params.sourceId) {
    filter += `__meta.sourceId = '${params.sourceId}'`
  }

  await index.namespace(params.namespace).delete({ filter })
}
