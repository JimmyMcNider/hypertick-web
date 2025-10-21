import { createClient } from 'redis';

let redis: ReturnType<typeof createClient> | null = null;

export async function getRedisClient() {
  if (!redis) {
    redis = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    });

    redis.on('error', (err) => {
      console.error('Redis Client Error', err);
    });

    await redis.connect();
  }

  return redis;
}

export async function setSession(sessionId: string, data: any, ttl: number = 3600) {
  const client = await getRedisClient();
  await client.setEx(`session:${sessionId}`, ttl, JSON.stringify(data));
}

export async function getSession(sessionId: string) {
  const client = await getRedisClient();
  const data = await client.get(`session:${sessionId}`);
  return data ? JSON.parse(data) : null;
}

export async function deleteSession(sessionId: string) {
  const client = await getRedisClient();
  await client.del(`session:${sessionId}`);
}