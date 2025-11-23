import sql from "mssql";
import { getMasterPool } from "../db/masterDb";
import { getAnalyticsPool } from "../db/analyticsDb";
import { ensureSqlIsSafeForAnalytics } from "./sqlSafety.service";

export interface ReportInput {
  name: string;
  description?: string;
  sqlQuery: string;
  folderId?: number | null;
}

export async function listReportsForUser(userId: number) {
  const pool = await getMasterPool();
  const result = await pool.request()
    .input("UserId", sql.Int, userId)
    .query(`
      SELECT Id, FolderId, UserId, Name, Description, SqlQuery, CreatedAt, UpdatedAt
      FROM Reports
      WHERE UserId = @UserId
      ORDER BY CreatedAt DESC
    `);
  return result.recordset;
}

export async function createReport(userId: number, input: ReportInput) {
  const pool = await getMasterPool();

  const result = await pool.request()
    .input("UserId", sql.Int, userId)
    .input("FolderId", sql.Int, input.folderId ?? null)
    .input("Name", sql.NVarChar, input.name)
    .input("Description", sql.NVarChar, input.description ?? null)
    .input("SqlQuery", sql.NVarChar, input.sqlQuery)
    .query(`
      INSERT INTO Reports (FolderId, UserId, Name, Description, SqlQuery)
      OUTPUT INSERTED.*
      VALUES (@FolderId, @UserId, @Name, @Description, @SqlQuery)
    `);

  return result.recordset[0];
}

export async function getReportById(userId: number, reportId: number) {
  const pool = await getMasterPool();

  const result = await pool.request()
    .input("UserId", sql.Int, userId)
    .input("Id", sql.Int, reportId)
    .query(`
      SELECT TOP 1 *
      FROM Reports
      WHERE Id = @Id AND UserId = @UserId
    `);

  return result.recordset[0] || null;
}

export async function cloneReport(userId: number, reportId: number) {
  const existing = await getReportById(userId, reportId);
  if (!existing) {
    throw new Error("Report not found");
  }

  const pool = await getMasterPool();

  const newName = `Copy of ${existing.Name}`;
  const result = await pool.request()
    .input("UserId", sql.Int, userId)
    .input("FolderId", sql.Int, existing.FolderId)
    .input("Name", sql.NVarChar, newName)
    .input("Description", sql.NVarChar, existing.Description)
    .input("SqlQuery", sql.NVarChar, existing.SqlQuery)
    .query(`
      INSERT INTO Reports (FolderId, UserId, Name, Description, SqlQuery)
      OUTPUT INSERTED.*
      VALUES (@FolderId, @UserId, @Name, @Description, @SqlQuery)
    `);

  return result.recordset[0];
}

export async function deleteReport(userId: number, reportId: number) {
  const pool = await getMasterPool();

  await pool.request()
    .input("UserId", sql.Int, userId)
    .input("Id", sql.Int, reportId)
    .query(`
      DELETE FROM Reports
      WHERE Id = @Id AND UserId = @UserId
    `);
}

export async function runReport(userId: number, reportId: number, rowLimit: number = 1000) {
  const report = await getReportById(userId, reportId);
  if (!report) {
    throw new Error("Report not found");
  }

  const sqlQuery: string = report.SqlQuery;
  ensureSqlIsSafeForAnalytics(sqlQuery);

  const pool = await getAnalyticsPool();

  // Optionally enforce a max row limit using SET ROWCOUNT
  const safeQuery = `
    SET ROWCOUNT ${rowLimit};
    ${sqlQuery};
    SET ROWCOUNT 0;
  `;

  const result = await pool.request().query(safeQuery);
  return result.recordset;
}
