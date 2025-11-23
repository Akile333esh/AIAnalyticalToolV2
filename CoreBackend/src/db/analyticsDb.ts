import sql, { ConnectionPool, config as SqlConfig } from "mssql";
import { config } from "../config/env";
import { logger } from "../utils/logger";

const analyticsDbConfig: SqlConfig = {
  user: config.ANALYTICS_DB_USER,
  password: config.ANALYTICS_DB_PASSWORD,
  server: config.ANALYTICS_DB_HOST,
  database: config.ANALYTICS_DB_NAME,
  options: {
    encrypt: config.ANALYTICS_DB_HOST !== 'localhost', // Good practice: Encrypt if not local
    trustServerCertificate: true
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

// ⚡️ THE FIX: Store the Promise, not just the pool
let poolPromise: Promise<ConnectionPool> | null = null;

export async function getAnalyticsPool(): Promise<ConnectionPool> {
  if (poolPromise) {
    return poolPromise;
  }

  poolPromise = new sql.ConnectionPool(analyticsDbConfig)
    .connect()
    .then((pool) => {
      logger.info("Connected to AnalyticsDB");
      return pool;
    })
    .catch((err) => {
      logger.error("❌ Database Connection Failed (AnalyticsDB): ", err);
      poolPromise = null; // Reset so we can try again on next request
      throw err;
    });

  return poolPromise;
}
