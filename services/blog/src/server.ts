import express from "express";
import dotenv from "dotenv";
import blogRoutes from "./routes/blog.js";
import { createClient } from "redis";
import { startCacheConsumer } from "./utils/consumer.js";
import cors from "cors";

dotenv.config();

const app = express();

app.use(express.json());
app.use(
    cors({
        origin: ["http://localhost:3000", "http://127.0.0.1:3000","https://blog-microservice-project-2025-mast.vercel.app"],
        credentials: true,
        methods: ["GET", "POST", "DELETE", "PUT", "PATCH"],
        allowedHeaders: ["Content-Type", "Authorization"],
    })
);

const port = process.env.PORT;

startCacheConsumer();

export const redisClient = createClient({
    url: process.env.REDIS_URL,
    socket: {
        // Exponential backoff up to 10s
        reconnectStrategy: (retries) => Math.min(retries * 1000, 10000),
    },
});

// Prevent process crash on transient network errors
redisClient.on("error", (err) => {
    console.error("Redis Client Error:", (err as Error).message);
});
redisClient.on("end", () => {
    console.warn("Redis connection closed");
});
redisClient.on("connect", () => {
    console.log("Connecting to redis...");
});
redisClient.on("ready", () => {
    console.log("Redis connection is ready");
});

redisClient
    .connect()
    .then(() => console.log("Connected to redis"))
    .catch(console.error);

    
// Keep the connection warm to avoid provider idle disconnects
const PING_INTERVAL_MS = 30000; // 30s
let pingTimer: NodeJS.Timeout | null = null;
const startRedisKeepAlive = () => {
    if (pingTimer) return;
    pingTimer = setInterval(() => {
        redisClient
            .ping()
            .catch(() => {
                // Ignore ping errors; reconnectStrategy will handle reconnection
            });
    }, PING_INTERVAL_MS);
};

redisClient.on("ready", startRedisKeepAlive);

process.on("SIGINT", async () => {
    if (pingTimer) clearInterval(pingTimer);
    try {
        await redisClient.quit();
    } finally {
        process.exit(0);
    }
});

app.use("/api/v1", blogRoutes);

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
