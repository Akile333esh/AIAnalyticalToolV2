import sql, { ConnectionPool, config as SqlConfig } from "mssql";
import { config } from "../config/env";

const ragDbConfig: SqlConfig = {
  user: config.RAG_DB_USER,
  password: config.RAG_DB_PASSWORD,
  server: config.RAG_DB_SERVER,
  database: config.RAG_DB_DATABASE,
  options: {
    encrypt: config.RAG_DB_SERVER !== 'localhost' && config.RAG_DB_SERVER !== '127.0.0.1',
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
      console.log("✅ Worker Connected to RAGDB");
      return pool;
    })
    .catch((err) => {
      console.error("❌ Worker Database Connection Failed (RAGDB): ", err);
      poolPromise = null;
      throw err;
    });

  return poolPromise;
}
