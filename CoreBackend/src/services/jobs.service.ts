import { JobsOptions, Queue } from "bullmq";
import { redisConnection } from "../config/env";
import { randomUUID } from "crypto";

export interface JobPayload {
  naturalLanguageQuery: string;
  timeRange?: string;
  metricType?: string;
  filters?: Record<string, any>;
}

const jobQueue = new Queue("jobs", {
  connection: redisConnection
});

export async function createJob(
  userId: number,
  payload: JobPayload
): Promise<{ jobId: string; jobToken: string }> {

  const jobToken = randomUUID();

  const job = await jobQueue.add(
    "job",
    {
      userId,
      jobToken,
      ...payload
    },
    {
      removeOnComplete: true,
      removeOnFail: false
    } as JobsOptions
  );

  return {
    jobId: job.id!,
    jobToken
  };
}

export async function cancelJob(jobId: string) {
  const job = await jobQueue.getJob(jobId);
  if (job) {
    // Attempt to remove from queue (stops it if waiting)
    await job.remove();
    // Note: If the worker is already executing the LLM call, 
    // this won't stop the Python thread immediately, 
    // but it prevents the job from completing successfully in the queue.
    return true;
  }
  return false;
}

