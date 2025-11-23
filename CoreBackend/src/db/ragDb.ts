import sql, { ConnectionPool, config as SqlConfig } from "mssql";
import { config } from "../config/env";
import { logger } from "../utils/logger";

const ragDbConfig: SqlConfig = {
  user: config.RAG_DB_USER,
  password: config.RAG_DB_PASSWORD,
  server: config.RAG_DB_HOST,
  database: config.RAG_DB_NAME,
  options: {
    encrypt: config.RAG_DB_HOST !== 'localhost',
    trustServerCertificate: true
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

let poolPromise: Promise<ConnectionPool> | null = null;

export async function getRagPool(): Promise<ConnectionPool> {
  if (poolPromise) {
    return poolPromise;
  }

  poolPromise = new sql.ConnectionPool(ragDbConfig)
    .connect()
    .then((pool) => {
      logger.info("Connected to RAGDB");
      return pool;
    })
    .catch((err) => {
      logger.error("❌ Database Connection Failed (RAGDB): ", err);
      poolPromise = null;
      throw err;
    });

  return poolPromise;
}
