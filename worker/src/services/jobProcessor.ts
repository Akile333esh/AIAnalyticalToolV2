import { Job } from "bullmq";
import { ensureSqlIsSafe, normalizeGeneratedSql } from "./sqlSafety.service";
import { generateSql, analyzeResults } from "./aiBackendClient"; // Import analyzeResults
import { publishJobEvent } from "./ssePublisher";
import { getAnalyticsPool } from "../db/analyticsDb";
import { getRagMetadata } from "./ragMetadata.service";

interface JobData {
  userId: number;
  jobId: string;
  naturalLanguageQuery: string;
  timeRange?: string;
  metricType?: string;
  filters?: Record<string, any>;
}

export async function processJob(job: Job<JobData>) {
  const { userId, jobId, naturalLanguageQuery, timeRange, metricType, filters } = job.data;
  const eventId = jobId || job.id || "";

  try {
    // 1. Notify Started
    await publishJobEvent(eventId, { type: "step", message: "Job received. Fetching context..." });
    const ragMetadata = await getRagMetadata(userId);

    // 2. Generate SQL
    const sqlGenResponse = await generateSql({
      natural_language: naturalLanguageQuery,
      time_range: timeRange || null,
      metric_type: metricType || null,
      filters: filters || null,
      metadata: ragMetadata,
      user_id: userId,
      job_id: eventId
    });

    const rawSql = (sqlGenResponse && (sqlGenResponse.generated_sql || sqlGenResponse.sql)) || "";
    const sqlQuery = normalizeGeneratedSql(rawSql);

    if (!sqlQuery) throw new Error("AI Service failed to generate a valid SQL query.");

    await publishJobEvent(eventId, {
      type: "step",
      message: "SQL generated. Validating safety...",
      sqlQuery
    });

    // 3. Validate & Execute
    ensureSqlIsSafe(sqlQuery);

    await publishJobEvent(eventId, { type: "step", message: "Executing query on database..." });

    const pool = await getAnalyticsPool();
    const result = await pool.request().query(sqlQuery);
    const rows = result.recordset;

    // 4. Send Data Rows IMMEDIATELY (So UI updates)
    await publishJobEvent(eventId, {
      type: "data", // New event type for just data
      message: `Query returned ${rows.length} rows. Analyzing results...`,
      rows: rows
    });

    // 5. Analyze Results (AI Step)
    // Only analyze if we have data
    let analysisResult = null;
    if (rows.length > 0) {
      await publishJobEvent(eventId, { type: "step", message: "AI is analyzing the data for insights..." });

      analysisResult = await analyzeResults({
        rows: rows,
        query: naturalLanguageQuery,
        sql: sqlQuery
      });
    }

    // 6. Finish Job (Send Analysis)
    await publishJobEvent(eventId, {
      type: "done",
      message: "Analysis complete.",
      rows: rows, // Send again just in case
      analysis: analysisResult // { analysis, anomalies, recommendations }
    });

    return rows;

  } catch (err: any) {
    console.error(`Job ${job.id} failed:`, err);
    await publishJobEvent(eventId, {
      type: "error",
      message: err?.message || "Job failed",
      error: err?.toString()
    });
    throw err;
  }
}