import { Router } from "express";
import asyncHandler from "express-async-handler";
import { authRequired } from "../middleware/authRequired";
import { createJob, cancelJob } from "../services/jobs.service";
import { initJobSseStream } from "../services/sse.service";
import { StatusCodes } from "http-status-codes";

const router = Router();

router.use(authRequired);

// Create Job
router.post(
  "/jobs",
  asyncHandler(async (req, res) => {
    const user = (req as any).user;
    const { naturalLanguageQuery, timeRange, metricType, filters } = req.body;

    const { jobId, jobToken } = await createJob(user.userId, {
      naturalLanguageQuery,
      timeRange,
      metricType,
      filters,
    });

    res.json({ jobId, jobToken });
  })
);

// Cancel Job
router.post(
  "/jobs/:id/cancel",
  asyncHandler(async (req, res) => {
    const jobId = req.params.id;
    await cancelJob(jobId);
    res.status(StatusCodes.OK).json({ message: "Job cancelled" });
  })
);

// SSE Stream
router.get(
  "/v2/jobs/:id/stream",
  (req, res) => {
    const jobId = req.params.id;
    const jobToken = req.query.t as string;
    initJobSseStream(req, res, jobId, jobToken);
  }
);

export default router;
