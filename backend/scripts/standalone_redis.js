const { RedisMemoryServer } = require('redis-memory-server');

async function startRedis() {
  const redisServer = await RedisMemoryServer.create({
    instance: {
      port: 6379,
      ip: '127.0.0.1',
    },
  });

  const host = await redisServer.getHost();
  const port = await redisServer.getPort();
  console.log(`🚀 Standalone Redis Memory Server running at ${host}:${port}`);
}

startRedis().catch((err) => {
  console.error('Failed to start Redis Memory Server:', err);
});
