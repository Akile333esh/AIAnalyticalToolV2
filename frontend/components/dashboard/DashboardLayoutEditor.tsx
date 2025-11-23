"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import type { DashboardLayout, DashboardWidget } from "@/lib/types";
import { DEFAULT_LAYOUT, normalizeLayoutResponse } from "@/lib/dashboardLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

export function DashboardLayoutEditor() {
  const [layout, setLayout] = useState<DashboardLayout | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadLayout = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await apiFetch<any>("/frontend/dashboard/layout", {
        auth: true
      });
      const normalized = normalizeLayoutResponse(res);
      setLayout(normalized);
    } catch (err: any) {
      setError(err.message ?? "Failed to load dashboard layout");
      setLayout(DEFAULT_LAYOUT);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadLayout();
  }, []);

  const updateWidget = (idx: number, patch: Partial<DashboardWidget>) => {
    if (!layout) return;
    const widgets = [...layout.widgets];
    widgets[idx] = { ...widgets[idx], ...patch };
    setLayout({ ...layout, widgets });
  };

  const addWidget = () => {
    if (!layout) return;
    const widgets = [
      ...layout.widgets,
      {
        id: `widget_${layout.widgets.length + 1}`,
        title: "New widget",
        type: "table" as const
      }
    ];
    setLayout({ ...layout, widgets });
  };

  const removeWidget = (idx: number) => {
    if (!layout) return;
    const widgets = layout.widgets.filter((_, i) => i !== idx);
    setLayout({ ...layout, widgets });
  };

  const saveLayout = async () => {
    if (!layout) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await apiFetch("/frontend/dashboard/layout", {
        method: "POST",
        auth: true,
        body: JSON.stringify({ layout })
      });
      setSuccess("Layout saved successfully");
    } catch (err: any) {
      setError(err.message ?? "Failed to save layout");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-slate-100">
            Dashboard layout
          </div>
          <div className="text-xs text-slate-500">
            Stored in <code>Dashboards</code> table via{" "}
            <code>/frontend/dashboard/layout</code>.
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={loadLayout}>
            Reload
          </Button>
          <Button onClick={saveLayout} loading={saving}>
            Save layout
          </Button>
        </div>
      </div>

      {loading && (
        <div className="text-xs text-slate-500">Loading layout…</div>
      )}

      {error && (
        <div className="mb-2 rounded-md border border-red-600/40 bg-red-950/40 px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-2 rounded-md border border-emerald-600/40 bg-emerald-950/40 px-3 py-2 text-xs text-emerald-300">
          {success}
        </div>
      )}

      {!loading && layout && (
        <div className="space-y-3 text-xs">
          {layout.widgets.map((w, idx) => (
            <div
              key={idx}
              className="flex flex-col gap-2 rounded-md border border-slate-800 bg-slate-900/70 p-3 md:flex-row md:items-center"
            >
              <div className="flex-1 space-y-1">
                <div className="flex flex-col gap-2 md:flex-row">
                  <div className="flex-1">
                    <label className="mb-1 block text-[11px] text-slate-300">
                      Widget ID
                      <span className="ml-1 text-[10px] text-slate-500">
                        (must match backend <code>getWidgetData</code>)
                      </span>
                    </label>
                    <Input
                      value={w.id}
                      onChange={(e) =>
                        updateWidget(idx, { id: e.target.value })
                      }
                    />
                  </div>
                  <div className="flex-1">
                    <label className="mb-1 block text-[11px] text-slate-300">
                      Title
                    </label>
                    <Input
                      value={w.title}
                      onChange={(e) =>
                        updateWidget(idx, { title: e.target.value })
                      }
                    />
                  </div>
                  <div className="w-32">
                    <label className="mb-1 block text-[11px] text-slate-300">
                      Type
                    </label>
                    <Select
                      value={w.type}
                      onChange={(e) =>
                        updateWidget(idx, {
                          type: e.target.value as DashboardWidget["type"]
                        })
                      }
                    >
                      <option value="kpi">kpi</option>
                      <option value="timeseries">timeseries</option>
                      <option value="table">table</option>
                      <option value="bar">bar</option>
                    </Select>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end md:w-24">
                <Button
                  variant="ghost"
                  onClick={() => removeWidget(idx)}
                  className="text-[11px] text-red-300"
                >
                  Remove
                </Button>
              </div>
            </div>
          ))}

          <Button variant="secondary" onClick={addWidget}>
            + Add widget
          </Button>
        </div>
      )}
    </Card>
  );
}
