import { Response, Request } from "express";
import { EventEmitter } from "events";

const jobEventBus = new EventEmitter();
jobEventBus.setMaxListeners(1000);

export interface JobEvent {
  type: "step" | "progress" | "reasoning" | "done" | "error";
  message?: string;
  progress?: number;
  etaSeconds?: number;
}

export function initJobSseStream(
  req: Request,
  res: Response,
  jobId: string,
  jobToken: string
) {
  // Basic token check placeholder (you can extend with DB / Redis validation)
  if (!jobToken) {
    res.status(401).end();
    return;
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  const listener = (event: JobEvent & { jobId: string }) => {
    if (event.jobId !== jobId) return;
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  jobEventBus.on("job-event", listener);

  req.on("close", () => {
    jobEventBus.off("job-event", listener);
  });
}

export function publishJobEvent(jobId: string, event: JobEvent) {
  jobEventBus.emit("job-event", { ...event, jobId });
}
