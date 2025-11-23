import { Router } from "express";
import asyncHandler from "express-async-handler";
import { authRequired } from "../middleware/authRequired";
import {
  getAllDashboards,
  getDashboardById,
  createDashboard,
  updateDashboard,
  deleteDashboard,
  getWidgetData,
  createSavedWidget,
  analyzeWidgetData
} from "../services/dashboard.service";

const router = Router();

router.use(authRequired);

// List all dashboards
router.get("/list", asyncHandler(async (req, res) => {
  const user = (req as any).user;
  const dashboards = await getAllDashboards(user.userId);
  res.json(dashboards);
}));

// Get one dashboard
router.get("/:id", asyncHandler(async (req, res) => {
  const user = (req as any).user;
  const dashboard = await getDashboardById(user.userId, Number(req.params.id));
  if (!dashboard) {
    res.status(404).json({ message: "Dashboard not found" });
    return;
  }
  res.json(dashboard);
}));

// Create dashboard
router.post("/", asyncHandler(async (req, res) => {
  const user = (req as any).user;
  const { name, layout } = req.body;
  const id = await createDashboard(user.userId, name || "New Dashboard", layout || { widgets: [] });
  res.json({ id, message: "Created" });
}));

// Update layout (Resize/Move widgets)
router.put("/:id", asyncHandler(async (req, res) => {
  const user = (req as any).user;
  const { layout } = req.body;
  await updateDashboard(user.userId, Number(req.params.id), layout);
  res.json({ message: "Updated" });
}));

// ✅ NEW: Delete Route
router.delete("/:id", asyncHandler(async (req, res) => {
  const user = (req as any).user;
  try {
    await deleteDashboard(user.userId, Number(req.params.id));
    res.json({ message: "Dashboard deleted" });
  } catch (err: any) {
    // Return 400 if validation failed (widgets exist), 500 otherwise
    if (err.message.includes("contains reports")) {
        res.status(400).json({ message: err.message });
    } else {
        throw err;
    }
  }
}));

// Save generated widget
router.post("/widget", asyncHandler(async (req, res) => {
  const user = (req as any).user;
  const { name, type, sqlQuery } = req.body;
  const widgetId = await createSavedWidget(user.userId, name, type, sqlQuery);
  res.json({ widgetId });
}));

// Execute widget data
router.get("/widget/:id/data", asyncHandler(async (req, res) => {
  const user = (req as any).user;
  const data = await getWidgetData(user.userId, req.params.id);
  res.json({ data });
}));

// ✅ NEW: Analyze Widget Endpoint
router.post("/widget/:id/analyze", asyncHandler(async (req, res) => {
  const user = (req as any).user;
  // 1. Get Data
  const data = await getWidgetData(user.userId, req.params.id);
  // 2. Analyze it
  const analysis = await analyzeWidgetData(data);
  res.json(analysis);
}));

export default router;