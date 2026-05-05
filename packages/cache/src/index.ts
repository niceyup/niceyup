import { redisClient } from './redis-client'

export type { Redis } from 'ioredis'

export const cache = redisClient
