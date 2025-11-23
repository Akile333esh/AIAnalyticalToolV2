import dotenv from "dotenv";

dotenv.config();

/**
 * Helper function to enforce required environment variables.
 * Throws an error if the variable is missing and no default is provided.
 */
function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;
  if (value === undefined) {
    throw new Error(`❌ Critical Error: Missing required environment variable '${key}'`);
  }
  return value;
}

export const config = {
  PORT: parseInt(getEnv("PORT", "4000"), 10),

  // Database Configs - No defaults allowed for security
  MASTER_DB_HOST: getEnv("MASTER_DB_HOST"),
  MASTER_DB_USER: getEnv("MASTER_DB_USER"),
  MASTER_DB_PASSWORD: getEnv("MASTER_DB_PASSWORD"),
  MASTER_DB_NAME: getEnv("MASTER_DB_NAME"),

  ANALYTICS_DB_HOST: getEnv("ANALYTICS_DB_HOST"),
  ANALYTICS_DB_USER: getEnv("ANALYTICS_DB_USER"),
  ANALYTICS_DB_PASSWORD: getEnv("ANALYTICS_DB_PASSWORD"),
  ANALYTICS_DB_NAME: getEnv("ANALYTICS_DB_NAME"),

  RAG_DB_HOST: getEnv("RAG_DB_HOST"),
  RAG_DB_USER: getEnv("RAG_DB_USER"),
  RAG_DB_PASSWORD: getEnv("RAG_DB_PASSWORD"),
  RAG_DB_NAME: getEnv("RAG_DB_NAME"),

  // Security
  JWT_SECRET: getEnv("JWT_SECRET"),
  JWT_EXPIRES_IN: getEnv("JWT_EXPIRES_IN", "15m"),
  REFRESH_TOKEN_EXPIRES_IN: getEnv("REFRESH_TOKEN_EXPIRES_IN", "7d"),
  
  // CORS (Added from previous step)
  CORS_ORIGIN: getEnv("CORS_ORIGIN", "http://localhost:3000"),

  // 👇 NEW: Define who gets to be the admin
  ADMIN_EMAIL: getEnv("ADMIN_EMAIL", ""), // Defaults to empty (no admins allowed by default)

  // Infrastructure
  REDIS_HOST: getEnv("REDIS_HOST", "localhost"),
  REDIS_PORT: parseInt(getEnv("REDIS_PORT", "6379"), 10),

  AI_BACKEND_URL: getEnv("AI_BACKEND_URL", "http://localhost:8001")
} as const;

