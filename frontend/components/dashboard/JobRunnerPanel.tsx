"use client";

import { useState } from "react";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { apiFetch, API_BASE_URL } from "@/lib/apiClient";
import type { JobEvent } from "@/lib/types";
import { getAccessToken } from "@/lib/auth";

interface CreateJobResponse {
  jobId: string;
  jobToken: string;
}

export function JobRunnerPanel() {
  const [query, setQuery] = useState(
    "Show average CPU, memory, and disk utilization by server for the last 24 hours"
  );
  const [events, setEvents] = useState<JobEvent[]>([]);
  const [rows, setRows] = useState<any[] | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRun = async () => {
    setError(null);
    setEvents([]);
    setRows(null);
    setRunning(true);

    try {
      const job = await apiFetch<CreateJobResponse>("/jobs", {
        method: "POST",
        auth: true,
        body: JSON.stringify({
          naturalLanguageQuery: query
        })
      });

      const token = getAccessToken();
      if (!token) {
        throw new Error("Missing access token");
      }

      const url = `${API_BASE_URL}/v2/jobs/${job.jobId}/stream?t=${encodeURIComponent(
        job.jobToken
      )}`;

      const res = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "text/event-stream"
        }
      });

      if (!res.body) {
        throw new Error("Streaming not supported in this browser");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      const processChunk = (chunk: string) => {
        buffer += chunk;
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const lines = part.split("\n");
          const dataLine = lines.find((l) => l.startsWith("data:"));
          if (!dataLine) continue;
          const json = dataLine.replace(/^data:\s*/, "");
          try {
            const evt = JSON.parse(json) as JobEvent;
            setEvents((prev) => [...prev, evt]);
            if (evt.type === "done" && (evt as any).rows) {
              setRows((evt as any).rows);
            }
          } catch (e) {
            console.warn("Failed to parse SSE event", e);
          }
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        processChunk(text);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? "Failed to run job");
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-col justify-between gap-3 md:flex-row">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">
            Natural language → SQL job runner
          </h2>
          <p className="text-xs text-slate-500">
            Uses Worker + AIBackend via <code>/jobs</code> and SSE stream.
          </p>
        </div>
        <Button onClick={handleRun} loading={running}>
          Run
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Query editor */}
        <div className="lg:col-span-1">
          <textarea
            className="min-h-[150px] w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {error && (
            <div className="mt-3 rounded-md border border-red-600/40 bg-red-950/40 px-3 py-2 text-xs text-red-300">
              {error}
            </div>
          )}
        </div>

        {/* Reasoning */}
        <div className="lg:col-span-1">
          <div className="mb-2 text-xs font-semibold text-slate-200">
            Job progress & reasoning
          </div>
          <div className="h-[220px] space-y-2 overflow-auto text-xs">
            {events.length === 0 && (
              <div className="text-slate-500">
                Run a query to see progress…
              </div>
            )}
            {events.map((evt, idx) => (
              <div
                key={idx}
                className="rounded-md bg-slate-900/80 p-2"
              >
                <div className="mb-1 text-[10px] uppercase tracking-wide text-brand">
                  {evt.type}
                </div>
                {evt.message && <div>{evt.message}</div>}
                {"sqlQuery" in evt && (evt as any).sqlQuery && (
                  <pre className="mt-2 overflow-x-auto rounded bg-slate-950/80 p-2 text-[10px] text-sky-300">
                    {(evt as any).sqlQuery}
                  </pre>
                )}
                {"sqlExplanation" in evt && (evt as any).sqlExplanation && (
                  <p className="mt-2 text-[11px] text-slate-300">
                    {(evt as any).sqlExplanation}
                  </p>
                )}
                {typeof evt.progress === "number" && (
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full bg-brand"
                      style={{ width: `${evt.progress * 100}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Result rows */}
        <div className="lg:col-span-1">
          <div className="mb-2 text-xs font-semibold text-slate-200">
            Result rows
          </div>
          {!rows && (
            <div className="text-xs text-slate-500">
              When the worker finishes, results from{" "}
              <code>AnalyticsDB</code> appear here.
            </div>
          )}
          {rows && rows.length === 0 && (
            <div className="text-xs text-slate-500">No rows returned.</div>
          )}
          {rows && rows.length > 0 && (
            <div className="h-[220px] overflow-auto text-xs">
              <table className="min-w-full border-collapse text-left">
                <thead className="sticky top-0 bg-slate-900">
                  <tr>
                    {Object.keys(rows[0]).map((col) => (
                      <th
                        key={col}
                        className="border-b border-slate-700 px-2 py-1 text-[11px] font-semibold text-slate-300"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 200).map((row, idx) => (
                    <tr
                      key={idx}
                      className="odd:bg-slate-950/60 even:bg-slate-900/60"
                    >
                      {Object.keys(rows[0]).map((col) => (
                        <td
                          key={col}
                          className="border-b border-slate-800 px-2 py-1 align-top"
                        >
                          {String(row[col] ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
