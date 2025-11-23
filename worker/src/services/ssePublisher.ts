import axios from "axios";

export async function publishJobEvent(jobId: string, event: any) {
  // Send event to CoreBackend event bus
  await axios.post(
    `http://localhost:4000/internal/jobs/${jobId}/event`,
    event,
    { timeout: 200000 }
  );
}
