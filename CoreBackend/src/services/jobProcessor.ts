import { Job } from "bullmq";
import { publishJobEvent } from "./ssePublisher";
import { AIBackendClient } from "./aiBackendClient";
import { runSqlSafely } from "./sqlSafety.service";
import analyticsDbPool from "../db/analyticsDb";

export async function processJob(job: Job) {
  const jobId = job.id!.toString();
  const jobToken = job.data.jobToken;

  try {
    await publishJobEvent(jobId, {
      type: "step",
      message: "Received job"
    });

    const query = job.data.naturalLanguageQuery;

    await publishJobEvent(jobId, {
      type: "step",
      message: "Calling AIBackend generateSQL"
    });

    const sqlResponse = await AIBackendClient.generateSQL(query);
    const generatedSql = sqlResponse.sql || sqlResponse.text;

    await publishJobEvent(jobId, {
      type: "reasoning",
      message: generatedSql
    });

    const safeSql = runSqlSafely(generatedSql);
    await publishJobEvent(jobId, {
      type: "step",
      message: "Running SQL"
    });

    const request = analyticsDbPool.request();
    const result = await request.query(safeSql);

    await publishJobEvent(jobId, {
      type: "done",
      message: "Completed",
      rows: result.recordset
    });

  } catch (err: any) {
    console.error("Job failed:", err);

    await publishJobEvent(jobId, {
      type: "error",
      message: err.message || "Unknown error"
    });
  }
}
