import { createClient } from "redis";

const isProduction = process.env.NODE_ENV === "production";

const redisClient = createClient({
  url: isProduction
    ? process.env.REDIS_URL 
    : process.env.REDIS_URL_LOCAL || "redis://localhost:6379",
  socket: isProduction
    ? {
        tls: true,
        rejectUnauthorized: false, 
      }
    : {}, 
});


redisClient.on("error", (err) => console.error("❌ Redis Error:", err));

await redisClient.connect();

console.log(`✅ Redis connected (${isProduction ? "Valkey Cloud" : "Local"})`);


export default redisClient;

