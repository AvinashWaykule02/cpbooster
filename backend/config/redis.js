import IORedis from "ioredis";

// single redis connection (reuse everywhere)
const redisConnection = new IORedis({
  host: "127.0.0.1",
  port: 6379,
  maxRetriesPerRequest: null, // important for BullMQ
});

redisConnection.on("connect", () => {
  console.log("✅ Redis Connected");
});

redisConnection.on("error", (err) => {
  console.error("❌ Redis Error:", err);
});

export default redisConnection;