export const redisConfig = {
    url: process.env.REDIS_URL || "redis://localhost:6379",
    ttl: 300, // 5 minutes
};
