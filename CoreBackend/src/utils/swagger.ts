import { Express } from "express";
import swaggerUi from "swagger-ui-express";

const basicOpenApi = {
  openapi: "3.0.0",
  info: {
    title: "CoreBackend API",
    version: "1.0.0",
    description: "CoreBackend for AI-Powered Capacity Analytics Platform",
  },
  paths: {
    "/auth/login": {
      post: {
        summary: "Login",
        responses: { "200": { description: "OK" } },
      },
    },
    "/auth/register": {
      post: {
        summary: "Register",
        responses: { "200": { description: "OK" } },
      },
    },
    "/frontend/reports": {
      get: {
        summary: "List reports",
        responses: { "200": { description: "OK" } },
      },
    },
  },
};

export function setupSwagger(app: Express) {
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(basicOpenApi));
}
