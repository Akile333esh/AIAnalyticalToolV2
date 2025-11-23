import { Router } from "express";
import asyncHandler from "express-async-handler";
import { publishJobEvent } from "../services/sse.service";

const router = Router();

/**
 * Internal Worker → CoreBackend events
 * No authentication — protected by internal network only
 */
router.post(
  "/jobs/:id/event",
  asyncHandler(async (req, res) => {
    const jobId = req.params.id;
    const event = req.body;

    publishJobEvent(jobId, event);

    res.status(204).end();
  })
);

export default router;
