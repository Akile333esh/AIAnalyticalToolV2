import sql, { ConnectionPool, config as SqlConfig } from "mssql";
import { config } from "../config/env";
import { logger } from "../utils/logger";

const masterDbConfig: SqlConfig = {
  user: config.MASTER_DB_USER,
  password: config.MASTER_DB_PASSWORD,
  server: config.MASTER_DB_HOST,
  database: config.MASTER_DB_NAME,
  options: {
    encrypt: config.MASTER_DB_HOST !== 'localhost',
    trustServerCertificate: true
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

let poolPromise: Promise<ConnectionPool> | null = null;

export async function getMasterPool(): Promise<ConnectionPool> {
  if (poolPromise) {
    return poolPromise;
  }

  poolPromise = new sql.ConnectionPool(masterDbConfig)
    .connect()
    .then((pool) => {
      logger.info("Connected to MasterDB");
      return pool;
    })
    .catch((err) => {
      logger.error("❌ Database Connection Failed (MasterDB): ", err);
      poolPromise = null;
      throw err;
    });

  return poolPromise;
}
