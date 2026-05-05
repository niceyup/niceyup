import Redis from 'ioredis'
import { env } from './lib/env'

export const redisClient = new Redis(env.REDIS_URL)
