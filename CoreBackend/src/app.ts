import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { logger } from "./utils/logger";
import authRoutes from "./routes/auth.routes";
import reportsRoutes from "./routes/reports.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import adminRoutes from "./routes/admin.routes";
import jobsRoutes from "./routes/jobs.routes";
import internalJobsRoutes from "./routes/internalJobs.route";
import { errorHandler } from "./middleware/errorHandler";
import { rateLimiter } from "./middleware/rateLimiter";
import { metricsMiddleware, metricsHandler } from "./utils/metrics";
import { setupSwagger } from "./utils/swagger";
import { config } from "./config/env"; // 👈 Import config

const app = express();

// 👇 SECURED: Only allow requests from the configured frontend URL
app.use(cors({
    origin: config.CORS_ORIGIN,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());
app.use(cookieParser());

// Metrics middleware (before routes)
app.use(metricsMiddleware);

// Simple rate limiter
app.use(rateLimiter);

// Swagger docs
setupSwagger(app);

// Routes
app.use("/auth", authRoutes);
app.use("/frontend/reports", reportsRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/admin", adminRoutes);
app.use("/internal", internalJobsRoutes);
app.use("/", jobsRoutes); // includes /jobs and /v2/jobs/:id/stream

// Health + metrics
app.get("/", (_req, res) => {
    res.send({ status: "CoreBackend running ✔" });
});

app.get("/metrics", metricsHandler);

// Global error handler
app.use(errorHandler);

export { app };
