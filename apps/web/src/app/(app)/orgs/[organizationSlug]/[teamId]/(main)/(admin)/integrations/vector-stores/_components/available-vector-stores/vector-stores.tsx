export const availableVectorStores = {
  upstash: {
    value: 'upstash' as const,
    label: 'Upstash',
    description:
      'Serverless vector storage built for low-latency search and effortless scalability.',
    image:
      'https://vercel.com/api/www/avatar/cfffdb788d0e6372f30572554f6e82fb45d4792a',
  },
  // pinecone: {
  //   value: 'pinecone' as const,
  //   label: 'Pinecone',
  //   description:
  //     'High-performance vector database designed for production-grade similarity search at scale.',
  //   image:
  //     'https://vercel.com/api/www/avatar/801cd2bc74924498bde46fc7bc9ec03ae067a270',
  // },
}

export type AvailableVectorStore = typeof availableVectorStores
