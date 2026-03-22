import { queue } from '@trigger.dev/sdk'

export const sourceQueue = queue({
  name: 'source',
  concurrencyLimit: 1,
})

export const indexedSourceQueue = queue({
  name: 'indexed-source',
  concurrencyLimit: 1,
})

export const knowledgeBaseQueue = queue({
  name: 'knowledge-base',
  concurrencyLimit: 1,
})
