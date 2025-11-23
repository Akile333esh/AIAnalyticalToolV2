import { Router } from "express";
import asyncHandler from "express-async-handler";
import { authRequired } from "../middleware/authRequired";
import {
  listReportsForUser,
  createReport,
  getReportById,
  cloneReport,
  deleteReport,
  runReport
} from "../services/reports.service";
import { StatusCodes } from "http-status-codes";

const router = Router();

// All routes require auth
router.use(authRequired);

// GET /frontend/reports
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const user = (req as any).user;
    const reports = await listReportsForUser(user.userId);
    res.json({ reports });
  })
);

// POST /frontend/reports
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const user = (req as any).user;
    const { name, description, sqlQuery, folderId } = req.body;
    const report = await createReport(user.userId, {
      name,
      description,
      sqlQuery,
      folderId
    });
    res.status(StatusCodes.CREATED).json({ report });
  })
);

// GET /frontend/reports/:id
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const user = (req as any).user;
    const id = parseInt(req.params.id, 10);
    const report = await getReportById(user.userId, id);
    if (!report) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Report not found" });
    }
    res.json({ report });
  })
);

// POST /frontend/reports/:id/clone
router.post(
  "/:id/clone",
  asyncHandler(async (req, res) => {
    const user = (req as any).user;
    const id = parseInt(req.params.id, 10);
    const cloned = await cloneReport(user.userId, id);
    res.status(StatusCodes.CREATED).json({ report: cloned });
  })
);

// DELETE /frontend/reports/:id
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const user = (req as any).user;
    const id = parseInt(req.params.id, 10);
    await deleteReport(user.userId, id);
    res.json({ message: "Report deleted" });
  })
);

// POST /frontend/reports/:id/run
router.post(
  "/:id/run",
  asyncHandler(async (req, res) => {
    const user = (req as any).user;
    const id = parseInt(req.params.id, 10);
    const limit = req.body.limit ? parseInt(req.body.limit, 10) : 1000;

    const rows = await runReport(user.userId, id, limit);
    res.json({ rows });
  })
);

export default router;
