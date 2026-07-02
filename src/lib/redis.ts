import Redis from "ioredis";
import { config } from "../config";
import { project } from "../config/project";
import { logger } from "./logger";

export const redis = new Redis(config.REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: project.redisMaxRetries,
});

redis.on("connect", () => logger.info("redis.connected"));
redis.on("error", (err) => logger.error({ err }, "redis.error"));

export async function setWithTTL(key: string, value: string, ttlSeconds: number): Promise<void> {
  await redis.set(key, value, "EX", ttlSeconds);
}

export async function getValue(key: string): Promise<string | null> {
  return redis.get(key);
}

export async function deleteKey(key: string): Promise<void> {
  await redis.del(key);
}

export async function keyExists(key: string): Promise<boolean> {
  const count = await redis.exists(key);
  return count > 0;
}
