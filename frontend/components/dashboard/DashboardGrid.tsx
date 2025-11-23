"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import type { DashboardWidget } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { WidgetCard } from "@/components/dashboard/WidgetCard";

// Helper to fetch data
function GenericWidget({ widget }: { widget: DashboardWidget }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    apiFetch<{ data: any }>(`/dashboard/widget/${widget.id}/data`, { auth: true })
      .then(res => setData(res.data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [widget.id]);

  if (loading) return <div className="text-xs text-slate-500 p-4 animate-pulse">Loading data...</div>;
  if (error) return <div className="text-xs text-red-400 p-4">Error: {error}</div>;

  // Render based on type (simple version)
  if (widget.type === "chart" || widget.type === "bar") {
     return (
       <div className="h-full flex items-end gap-1 p-2">
         {Array.isArray(data) && data.slice(0, 20).map((d, i) => {
           const val = Object.values(d).find(v => typeof v === 'number') as number || 0;
           return (
             <div key={i} className="bg-brand/70 flex-1 min-w-[5px] rounded-t-sm" style={{ height: `${Math.min(val, 100)}%` }} title={String(val)} />
           )
         })}
       </div>
     )
  }

  // Table / Default
  return (
    <div className="overflow-auto h-full max-h-60 w-full">
      {Array.isArray(data) && data.length > 0 ? (
        <table className="w-full text-left text-[10px] text-slate-300">
          <thead className="sticky top-0 bg-slate-900">
            <tr>{Object.keys(data[0]).map(k => <th key={k} className="p-1 border-b border-slate-700">{k}</th>)}</tr>
          </thead>
          <tbody>
            {data.map((row: any, i: number) => (
              <tr key={i} className="border-b border-slate-800/50">
                {Object.values(row).map((v: any, j: number) => <td key={j} className="p-1">{String(v)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="text-xs text-slate-500 p-2">No data returned</div>
      )}
    </div>
  );
}

export function DashboardGrid({ widgets }: { widgets: DashboardWidget[] }) {
  if (!widgets || widgets.length === 0) {
    return <div className="text-slate-500 text-sm p-4">No widgets in this dashboard.</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {widgets.map((w, idx) => (
        <div key={idx} className={w.colSpan === 2 ? "md:col-span-2" : w.colSpan === 3 ? "md:col-span-3" : ""}>
          <WidgetCard title={w.title}>
            <GenericWidget widget={w} />
          </WidgetCard>
        </div>
      ))}
    </div>
  );
}
