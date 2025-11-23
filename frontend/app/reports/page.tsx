"use client";

import { useState, useEffect } from "react";
import { ProtectedClient } from "@/components/auth/ProtectedClient";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { apiFetch } from "@/lib/apiClient";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

export default function ReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [filterText, setFilterText] = useState("");

  useEffect(() => {
    loadReports();
    const handleClick = () => setOpenMenuId(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const loadReports = async () => {
    try {
      const res = await apiFetch("/reports", { auth: true });
      setReports(res.reports || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!confirm("Delete this report?")) return;
    try {
      await apiFetch(`/reports/${id}`, { method: "DELETE", auth: true });
      loadReports();
    } catch (e) {
      alert("Failed to delete report");
    }
  };

  const filteredReports = reports.filter(r => r.Name.toLowerCase().includes(filterText.toLowerCase()));

  return (
    <ProtectedClient>
      <div className="flex min-h-screen bg-slate-950 text-slate-200">
        <Sidebar />
        <div className="flex flex-1 flex-col">
          <Topbar />
          <main className="flex-1 p-6">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold text-white">Reports</h1>
              <input 
                  placeholder="Filter reports..." 
                  className="bg-slate-900 border border-slate-700 rounded px-3 py-1 text-sm outline-none focus:border-brand"
                  value={filterText}
                  onChange={e => setFilterText(e.target.value)}
              />
            </div>

            {loading ? <div>Loading...</div> : (
              <div className="grid grid-cols-1 gap-4">
                {filteredReports.map((r) => (
                  <div key={r.Id} className="relative bg-slate-900/40 border border-slate-800 p-4 rounded-lg flex justify-between items-center hover:bg-slate-900/60 transition-colors">
                    <div className="flex-1">
                        <Link href={`/reports/${r.Id}`} className="font-semibold text-slate-100 hover:text-brand hover:underline">
                            {r.Name}
                        </Link>
                        <div className="text-xs text-slate-500 mt-1">{r.Description || "No description"}</div>
                    </div>
                    
                    {/* MENU */}
                    <div className="relative">
                        <button 
                            onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === r.Id ? null : r.Id); }}
                            className="p-2 hover:bg-slate-800 rounded-full"
                        >
                            ⋮
                        </button>
                        {openMenuId === r.Id && (
                            <div className="absolute right-0 mt-2 w-32 bg-slate-800 border border-slate-700 rounded shadow-xl z-20">
                                <button onClick={() => alert("Analysis not implemented for list items yet")} className="w-full text-left px-4 py-2 text-xs hover:bg-slate-700">Analyze</button>
                                <button onClick={(e) => handleDelete(e, r.Id)} className="w-full text-left px-4 py-2 text-xs text-red-400 hover:bg-slate-700">Delete</button>
                            </div>
                        )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </ProtectedClient>
  );
}