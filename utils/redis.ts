import { Redis } from '@upstash/redis'

const url =
  process.env.UPSTASH_REDIS_REST_URL ||
  process.env.KV_REST_API_URL ||
  process.env.KV_URL ||
  process.env.REDIS_URL

const token =
  process.env.UPSTASH_REDIS_REST_TOKEN ||
  process.env.KV_REST_API_TOKEN

if (!url || !token) {
  throw new Error('Missing Redis environment variables')
}

export const kv = new Redis({
  url,
  token,
})
