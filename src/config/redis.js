// config/redis.js
import { createClient } from "redis";

const redisClient = createClient({
  url: process.env.REDIS_URL_LOCAL || "redis://localhost:6379",
  socket: {
    tls: true, 
  },
});

redisClient.on("error", (err) => console.error("❌ Redis Error:", err));

await redisClient.connect();

console.log("✅ Connected to Valkey (Redis-compatible) successfully");

export default redisClient;
