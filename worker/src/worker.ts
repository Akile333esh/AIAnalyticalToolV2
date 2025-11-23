import { Worker } from "bullmq";
import { redisConnection } from "./config/env";
import { processJob } from "./services/jobProcessor";
import { getAnalyticsPool } from "./db/analyticsDb";
import { getRagPool } from "./db/ragDb"; // Import this

async function startWorker() {
  console.log("🚀 Worker starting...");

  try {
    // 1. Pre-connect to the Database
    // This ensures the app crashes immediately if DB credentials are wrong,
    // rather than waiting for a user to submit a job to fail.
    console.log("🔌 Initializing Database Connection...");
    await getAnalyticsPool();
    await getRagPool(); // Initialize the RAG pool
    console.log("✅ Database Connected Successfully.");

    // 2. Start the BullMQ Worker
    const worker = new Worker(
      "jobs",
      async (job) => {
        await processJob(job);
      },
      { 
        connection: redisConnection,
        concurrency: 10
      }
    );

    worker.on("completed", (job) => {
      console.log(`Job completed: ${job.id}`);
    });

    worker.on("failed", (job, err) => {
      console.log(`Job failed: ${job?.id}:`, err);
    });

    console.log("👷 Worker is ready and listening for jobs.");

    // Graceful Shutdown Logic (Optional but recommended)
    process.on('SIGTERM', async () => {
      console.log('SIGTERM signal received: closing worker');
      await worker.close();
      process.exit(0);
    });

  } catch (err) {
    console.error("❌ Worker failed to start:", err);
    process.exit(1); // Exit with error code so Docker/PM2 knows to restart or log error
  }
}

// Execute the startup function
startWorker();

