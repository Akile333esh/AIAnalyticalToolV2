import sql, { ConnectionPool, config as SqlConfig } from "mssql";
import { config } from "../config/env";

const analyticsDbConfig: SqlConfig = {
  user: config.ANALYTICS_DB_USER,
  password: config.ANALYTICS_DB_PASSWORD,
  server: config.ANALYTICS_DB_SERVER,
  database: config.ANALYTICS_DB_DATABASE,
  requestTimeout: 600000,
  options: {
    // Auto-encrypt if not local
    encrypt: config.ANALYTICS_DB_SERVER !== 'localhost' && config.ANALYTICS_DB_SERVER !== '127.0.0.1',
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
      console.log("✅ Worker Connected to AnalyticsDB");
      return pool;
    })
    .catch((err) => {
      console.error("❌ Worker Database Connection Failed (AnalyticsDB): ", err);
      poolPromise = null; // Reset so we can try again on next job
      throw err;
    });

  return poolPromise;
}
