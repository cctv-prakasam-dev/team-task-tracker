import Redis from "ioredis";

import type { Task } from "../db/schema/tasks.js";
import { redisConfig } from "../config/redisConfig.js";

const redis = new Redis(redisConfig.url);

redis.on("error", (err) => console.error("Redis error:", err));

function assigneeCacheKey(userId: number): string {
  return `tasks:assignee:${userId}`;
}

async function getTasksCache(userId: number): Promise<Task[] | null> {
  const data = await redis.get(assigneeCacheKey(userId));
  return data ? (JSON.parse(data) as Task[]) : null;
}

async function setTasksCache(userId: number, tasks: Task[]): Promise<void> {
  await redis.setex(assigneeCacheKey(userId), redisConfig.ttl, JSON.stringify(tasks));
}

async function invalidateTasksCache(userId: number): Promise<void> {
  await redis.del(assigneeCacheKey(userId));
}

export const cacheService = {
  getTasksCache,
  setTasksCache,
  invalidateTasksCache,
};
