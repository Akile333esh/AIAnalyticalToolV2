"use client";

import { useEffect, useState, FormEvent } from "react";
import { ProtectedClient } from "@/components/auth/ProtectedClient";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { apiFetch } from "@/lib/apiClient";
import type { Report } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Report | null>(null);
  const [sql, setSql] = useState("");
  const [rows, setRows] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadReports = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ reports: Report[] }>("/reports", {
        auth: true
      });
      setReports(data.reports ?? data);
    } catch (err: any) {
      setError(err.message ?? "Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadReports();
  }, []);

  const handleSelect = (rep: Report) => {
    setSelected(rep);
    setSql((rep as any).SqlQuery ?? "");
    setRows(null);
    setError(null);
  };

  const handleRun = async () => {
    if (!selected) return;
    setError(null);
    setRows(null);
    try {
      const data = await apiFetch<{ rows: any[] }>(
        `/reports/${selected.Id}/run`,
        {
          method: "POST",
          auth: true,
          body: JSON.stringify({ limit: 1000 })
        }
      );
      setRows(data.rows ?? []);
    } catch (err: any) {
      setError(err.message ?? "Failed to run report");
    }
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const name = (form.elements.namedItem("name") as HTMLInputElement).value;
    const description = (form.elements.namedItem("description") as HTMLInputElement)
      .value;

    try {
      await apiFetch("/reports", {
        method: "POST",
        auth: true,
        body: JSON.stringify({ name, description, sqlQuery: sql })
      });
      form.reset();
      await loadReports();
    } catch (err: any) {
      setError(err.message ?? "Failed to create report");
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    try {
      await apiFetch(`/reports/${selected.Id}`, {
        method: "DELETE",
        auth: true
      });
      setSelected(null);
      setSql("");
      setRows(null);
      await loadReports();
    } catch (err: any) {
      setError(err.message ?? "Failed to delete report");
    }
  };

  return (
    <ProtectedClient>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex flex-1 flex-col">
          <Topbar />
          <main className="flex-1 space-y-4 p-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <Card className="col-span-1">
                <div className="mb-2 text-sm font-semibold">Saved reports</div>
                {loading && (
                  <div className="text-xs text-slate-500">Loading…</div>
                )}
                {!loading && reports.length === 0 && (
                  <div className="text-xs text-slate-500">No reports yet.</div>
                )}
                <ul className="mt-2 space-y-1 text-xs">
                  {reports.map((rep) => (
                    <li key={rep.Id}>
                      <button
                        className={`w-full rounded-md px-2 py-1 text-left ${
                          selected?.Id === rep.Id
                            ? "bg-slate-800 text-brand"
                            : "text-slate-300 hover:bg-slate-900"
                        }`}
                        onClick={() => handleSelect(rep)}
                      >
                        {rep.Name}
                      </button>
                    </li>
                  ))}
                </ul>
              </Card>

              <Card className="col-span-1 flex flex-col">
                <div className="mb-2 text-sm font-semibold">Definition</div>
                <div className="mb-2 text-xs text-slate-400">
                  You can preview or edit the SQL for the selected report.
                </div>
                <textarea
                  className="min-h-[200px] flex-1 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100"
                  value={sql}
                  onChange={(e) => setSql(e.target.value)}
                  placeholder="SELECT * FROM AnalyticsDB.dbo.CpuPerformance"
                />
                <div className="mt-3 flex gap-2">
                  <Button onClick={handleRun} disabled={!selected}>
                    Run report
                  </Button>
                  <Button variant="danger" onClick={handleDelete} disabled={!selected}>
                    Delete
                  </Button>
                </div>
              </Card>

              <Card className="col-span-1 flex flex-col">
                <div className="mb-2 text-sm font-semibold">Create new report</div>
                <form onSubmit={handleCreate} className="space-y-2 text-xs">
                  <div>
                    <label className="mb-1 block text-slate-300">Name</label>
                    <Input name="name" required />
                  </div>
                  <div>
                    <label className="mb-1 block text-slate-300">Description</label>
                    <Input name="description" />
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Current SQL in the editor will be used as the new report definition.
                  </p>
                  <Button type="submit" className="mt-2">
                    Save report
                  </Button>
                </form>
              </Card>
            </div>

            {error && (
              <div className="rounded-md border border-red-600/40 bg-red-950/40 px-3 py-2 text-xs text-red-300">
                {error}
              </div>
            )}

            {rows && (
              <Card>
                <div className="mb-2 text-sm font-semibold">Report rows</div>
                {rows.length === 0 && (
                  <div className="text-xs text-slate-500">No rows returned.</div>
                )}
                {rows.length > 0 && (
                  <div className="overflow-auto text-xs">
                    <table className="min-w-full border-collapse text-left">
                      <thead>
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
                        {rows.slice(0, 200).map((row: any, idx: number) => (
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
              </Card>
            )}
          </main>
        </div>
      </div>
    </ProtectedClient>
  );
}
