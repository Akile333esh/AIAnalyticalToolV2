import sql from "mssql";
import axios from "axios";
import { getMasterPool } from "../db/masterDb";
import { getAnalyticsPool } from "../db/analyticsDb";
import { config } from "../config/env";

// --- MULTI-DASHBOARD CRUD ---

export async function getAllDashboards(userId: number) {
  const pool = await getMasterPool();
  const result = await pool.request()
    .input("UserId", sql.Int, userId)
    .query(`SELECT Id, Name, CreatedAt FROM Dashboards WHERE UserId = @UserId ORDER BY CreatedAt DESC`);
  return result.recordset;
}

export async function getDashboardById(userId: number, dashboardId: number) {
  const pool = await getMasterPool();
  const result = await pool.request()
    .input("UserId", sql.Int, userId)
    .input("Id", sql.Int, dashboardId)
    .query(`SELECT * FROM Dashboards WHERE UserId = @UserId AND Id = @Id`);
  
  const row = result.recordset[0];
  if (!row) return null;

  // Parse layout safely
  let widgets = [];
  try {
    const json = JSON.parse(row.LayoutJson || '{"widgets":[]}');
    widgets = json.widgets || [];
  } catch (e) {
    widgets = [];
  }

  return {
    id: row.Id,
    name: row.Name,
    widgets
  };
}

export async function createDashboard(userId: number, name: string, layout: any) {
  const pool = await getMasterPool();
  const layoutJson = JSON.stringify(layout);
  
  const result = await pool.request()
    .input("UserId", sql.Int, userId)
    .input("Name", sql.NVarChar, name)
    .input("LayoutJson", sql.NVarChar, layoutJson)
    .query(`
      INSERT INTO Dashboards (UserId, Name, LayoutJson)
      OUTPUT INSERTED.Id
      VALUES (@UserId, @Name, @LayoutJson)
    `);
  
  return result.recordset[0].Id;
}

export async function updateDashboard(userId: number, dashboardId: number, layout: any) {
  const pool = await getMasterPool();
  const layoutJson = JSON.stringify(layout);
  
  await pool.request()
    .input("UserId", sql.Int, userId)
    .input("Id", sql.Int, dashboardId)
    .input("LayoutJson", sql.NVarChar, layoutJson)
    .query(`
      UPDATE Dashboards
      SET LayoutJson = @LayoutJson, UpdatedAt = SYSUTCDATETIME()
      WHERE Id = @Id AND UserId = @UserId
    `);
}

// ✅ NEW: Delete Dashboard with Safety Check
export async function deleteDashboard(userId: number, dashboardId: number) {
  const pool = await getMasterPool();

  // 1. Check if dashboard has widgets
  const checkResult = await pool.request()
    .input("UserId", sql.Int, userId)
    .input("Id", sql.Int, dashboardId)
    .query(`SELECT LayoutJson FROM Dashboards WHERE Id = @Id AND UserId = @UserId`);

  if (checkResult.recordset.length === 0) {
    throw new Error("Dashboard not found");
  }

  const layoutRow = checkResult.recordset[0];
  let widgets = [];
  try {
    const json = JSON.parse(layoutRow.LayoutJson || '{"widgets":[]}');
    widgets = json.widgets || [];
  } catch (e) {}

  if (widgets.length > 0) {
    // ⛔ BLOCK DELETION
    throw new Error("Cannot delete dashboard because it contains reports/widgets. Please remove them first.");
  }

  // 2. Proceed to Delete
  await pool.request()
    .input("UserId", sql.Int, userId)
    .input("Id", sql.Int, dashboardId)
    .query(`DELETE FROM Dashboards WHERE Id = @Id AND UserId = @UserId`);
}

// --- WIDGET MANAGEMENT ---

export async function createSavedWidget(userId: number, name: string, type: string, sqlQuery: string) {
  const pool = await getMasterPool();
  
  const result = await pool.request()
    .input("UserId", sql.Int, userId)
    .input("Name", sql.NVarChar, name)
    .input("Type", sql.NVarChar, type)
    .input("SqlQuery", sql.NVarChar, sqlQuery)
    .query(`
      INSERT INTO SavedWidgets (UserId, Name, Type, SqlQuery)
      OUTPUT INSERTED.Id
      VALUES (@UserId, @Name, @Type, @SqlQuery)
    `);

  return result.recordset[0].Id;
}

export async function getWidgetData(userId: number, widgetId: string) {
  const dbWidgetId = parseInt(widgetId, 10);
  if (isNaN(dbWidgetId)) return []; 

  // 1. Fetch SQL from Master DB
  const masterPool = await getMasterPool();
  const widgetDef = await masterPool.request()
    .input("Id", sql.Int, dbWidgetId)
    .input("UserId", sql.Int, userId)
    .query(`SELECT SqlQuery FROM SavedWidgets WHERE Id = @Id AND UserId = @UserId`);

  const row = widgetDef.recordset[0];
  if (!row) throw new Error(`Widget #${widgetId} not found.`);

  // 2. Execute SQL on Analytics DB
  const analyticsPool = await getAnalyticsPool();
  try {
    const result = await analyticsPool.request().query(row.SqlQuery);
    return result.recordset;
  } catch (err: any) {
    console.error(`Widget ${widgetId} Execution Failed:`, err);
    throw new Error("Failed to retrieve widget data.");
  }
}

// ✅ NEW: Helper to call AI Backend
export async function analyzeWidgetData(rows: any[]) {
  try {
    const response = await axios.post(`${config.AI_BACKEND_URL}/v1/analyze_results`, {
      rows: rows,
      query: "Analyze this widget data", // Generic context
      sql: ""
    });
    return response.data;
  } catch (e) {
    console.error("AI Analysis Failed", e);
    return { analysis: "Analysis unavailable.", anomalies: [], recommendations: [] };
  }
}