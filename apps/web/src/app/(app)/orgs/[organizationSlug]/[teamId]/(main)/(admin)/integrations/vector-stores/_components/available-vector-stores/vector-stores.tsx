export const availableVectorStores = {
  upstash: {
    value: 'upstash' as const,
    label: 'Upstash',
    description:
      'Serverless vector storage built for low-latency search and effortless scalability.',
  },
}

export type AvailableVectorStore = typeof availableVectorStores
