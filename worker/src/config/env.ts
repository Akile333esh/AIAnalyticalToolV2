import * as dotenv from "dotenv";
dotenv.config();

function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;
  if (value === undefined) {
    throw new Error(`❌ Worker Error: Missing required environment variable '${key}'`);
  }
  return value;
}

export const config = {
  PORT: getEnv("PORT", "5001"),

  REDIS_HOST: getEnv("REDIS_HOST", "127.0.0.1"),
  REDIS_PORT: Number(getEnv("REDIS_PORT", "6379")),

  ANALYTICS_DB_SERVER: getEnv("ANALYTICS_DB_SERVER"),
  ANALYTICS_DB_DATABASE: getEnv("ANALYTICS_DB_DATABASE"),
  ANALYTICS_DB_USER: getEnv("ANALYTICS_DB_USER"),
  ANALYTICS_DB_PASSWORD: getEnv("ANALYTICS_DB_PASSWORD"),

  RAG_DB_SERVER: getEnv("RAG_DB_SERVER"),
  RAG_DB_DATABASE: getEnv("RAG_DB_DATABASE"),
  RAG_DB_USER: getEnv("RAG_DB_USER"),
  RAG_DB_PASSWORD: getEnv("RAG_DB_PASSWORD"),

  AI_BACKEND_URL: getEnv("AIBACKEND_URL", "http://localhost:8001"),
};

// Required export for BullMQ Worker
export const redisConnection = {
  host: config.REDIS_HOST,
  port: config.REDIS_PORT,
};
