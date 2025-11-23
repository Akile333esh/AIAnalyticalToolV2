import client from "prom-client";

const register = new client.Registry();

const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.01, 0.05, 0.1, 0.3, 1, 3, 5],
});

register.registerMetric(httpRequestDuration);
client.collectDefaultMetrics({ register });

export function metricsMiddleware(req: any, res: any, next: any) {
  const end = httpRequestDuration.startTimer();
  res.on("finish", () => {
    end({
      method: req.method,
      route: req.route?.path || req.path,
      status_code: res.statusCode,
    });
  });
  next();
}

export async function metricsHandler(_req: any, res: any) {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
}
