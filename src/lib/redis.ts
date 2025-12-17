import { createClient } from 'redis';

type RedisClient = ReturnType<typeof createClient>;

declare global {
  // eslint-disable-next-line no-var
  var __redisClient: RedisClient | undefined;
}

export const getRedis = async (): Promise<RedisClient> => {
  if (!process.env.REDIS_URL) throw new Error('REDIS_URL is not set');

  if (!globalThis.__redisClient) {
    const c: RedisClient = createClient({ url: process.env.REDIS_URL });
    c.on('error', (err) => console.error('[redis] error', err));
    await c.connect();
    globalThis.__redisClient = c;
  }

  return globalThis.__redisClient;
};