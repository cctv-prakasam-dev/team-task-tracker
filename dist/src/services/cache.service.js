import Redis from "ioredis";
import { redisConfig } from "../config/redisConfig.js";
const redis = new Redis(redisConfig.url);
redis.on("error", (err) => console.error("Redis error:", err));
function assigneeCacheKey(userId) {
    return `tasks:assignee:${userId}`;
}
async function getTasksCache(userId) {
    const data = await redis.get(assigneeCacheKey(userId));
    return data ? JSON.parse(data) : null;
}
async function setTasksCache(userId, tasks) {
    await redis.setex(assigneeCacheKey(userId), redisConfig.ttl, JSON.stringify(tasks));
}
async function invalidateTasksCache(userId) {
    await redis.del(assigneeCacheKey(userId));
}
export const cacheService = {
    getTasksCache,
    setTasksCache,
    invalidateTasksCache,
};
