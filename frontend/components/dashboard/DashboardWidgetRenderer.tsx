"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import type { DashboardWidget } from "@/lib/types";

export function DashboardWidgetRenderer({ widget }: { widget: DashboardWidget }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    
    // Use the new endpoint: /widget/:id/data
    apiFetch<{ data: any }>(`/dashboard/widget/${widget.id}/data`, { auth: true })
      .then(res => {
        if (mounted) setData(res.data);
      })
      .catch(err => {
        if (mounted) setError(err.message);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => { mounted = false; };
  }, [widget.id]);

  if (loading) return <div className="text-xs text-slate-500 p-4 animate-pulse">Loading data...</div>;
  if (error) return <div className="text-xs text-red-400 p-4">Error: {error}</div>;

  // 1. Chart/Bar Visualization
  if (widget.type === "chart" || widget.type === "bar") {
     return (
       <div className="h-full flex items-end gap-1 p-2 min-h-[150px]">
         {Array.isArray(data) && data.slice(0, 30).map((d, i) => {
           // Find first numeric value
           const val = Object.values(d).find(v => typeof v === 'number') as number || 0;
           return (
             <div 
               key={i} 
               className="bg-brand/70 hover:bg-brand flex-1 min-w-[4px] rounded-t-sm transition-all relative group" 
               style={{ height: `${Math.min(Math.abs(val), 100)}%` }} 
             >
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-black text-white text-[10px] p-1 rounded z-10 whitespace-nowrap">
                  {val}
                </div>
             </div>
           )
         })}
         {(!Array.isArray(data) || data.length === 0) && <div className="text-xs text-slate-500 m-auto">No data</div>}
       </div>
     )
  }

  // 2. Table Visualization (Default)
  return (
    <div className="overflow-auto h-full w-full max-h-[300px] scrollbar-thin scrollbar-thumb-slate-700">
      {Array.isArray(data) && data.length > 0 ? (
        <table className="w-full text-left text-[11px] text-slate-300">
          <thead className="sticky top-0 bg-slate-900 z-10">
            <tr>
              {Object.keys(data[0]).map(k => (
                <th key={k} className="p-2 border-b border-slate-700 font-semibold">{k}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row: any, i: number) => (
              <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                {Object.values(row).map((v: any, j: number) => (
                  <td key={j} className="p-2 truncate max-w-[150px]" title={String(v)}>{String(v)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="text-xs text-slate-500 p-4 flex items-center justify-center h-full">
          {Array.isArray(data) ? "No rows returned" : JSON.stringify(data)}
        </div>
      )}
    </div>
  );
}
