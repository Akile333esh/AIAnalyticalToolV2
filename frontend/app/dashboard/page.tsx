"use client";

import { useState, useEffect } from "react";
import { ProtectedClient } from "@/components/auth/ProtectedClient";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { apiFetch } from "@/lib/apiClient";
import { Button } from "@/components/ui/Button";
import { WidgetCard } from "@/components/dashboard/WidgetCard";
import { DashboardWidgetRenderer } from "@/components/dashboard/DashboardWidgetRenderer";
import { downloadResults } from "@/lib/downloadUtils";
import type { DashboardLayout } from "@/lib/types";

export default function DashboardPage() {
  const [dashboards, setDashboards] = useState<any[]>([]);
  const [activeDashboard, setActiveDashboard] = useState<DashboardLayout | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  // Menus
  const [openDashMenuId, setOpenDashMenuId] = useState<number | null>(null);
  const [filterText, setFilterText] = useState("");
  const [openWidgetMenuId, setOpenWidgetMenuId] = useState<string | null>(null);

  // Analysis Modal
  const [analysisData, setAnalysisData] = useState<any | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    loadList();
    const handleClick = () => {
      setOpenDashMenuId(null);
      setOpenWidgetMenuId(null);
    };
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const loadList = async () => {
    try {
      setLoading(true);
      const data = await apiFetch("/dashboard/list", { auth: true });
      setDashboards(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadDashboard = async (id: number) => {
    try {
      setLoading(true);
      const data = await apiFetch(`/dashboard/${id}`, { auth: true });
      setActiveDashboard(data);
      setIsEditing(false);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const createDashboard = async () => {
    const name = prompt("Enter Dashboard Name:");
    if (!name) return;
    try {
      await apiFetch("/dashboard", { method: "POST", auth: true, body: JSON.stringify({ name }) });
      loadList();
    } catch (e) {
      alert("Failed to create dashboard");
    }
  };

  const handleDeleteDashboard = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!confirm("Delete this dashboard?")) return;
    try {
      await apiFetch(`/dashboard/${id}`, { method: "DELETE", auth: true });
      loadList();
    } catch (err: any) {
      alert(err.message || "Failed to delete. Ensure it is empty.");
    }
  };

  const saveLayout = async () => {
    if (!activeDashboard || !activeDashboard.id) return;
    try {
      await apiFetch(`/dashboard/${activeDashboard.id}`, {
        method: "PUT",
        auth: true,
        body: JSON.stringify({ layout: { widgets: activeDashboard.widgets } })
      });
      setIsEditing(false);
    } catch (e) {
      alert("Failed to save layout");
    }
  };

  // Widget Actions
  const toggleWidgetSize = (widgetId: string) => {
    if (!activeDashboard) return;
    const updatedWidgets = activeDashboard.widgets.map(w => {
      if (w.id === widgetId) {
        const currentSpan = w.colSpan || 1;
        return { ...w, colSpan: currentSpan >= 3 ? 1 : currentSpan + 1 };
      }
      return w;
    });
    setActiveDashboard({ ...activeDashboard, widgets: updatedWidgets });
  };

  const removeWidget = (widgetId: string) => {
    if (!activeDashboard) return;
    if (!confirm("Remove this widget?")) return;
    const updatedWidgets = activeDashboard.widgets.filter(w => w.id !== widgetId);
    setActiveDashboard({ ...activeDashboard, widgets: updatedWidgets });
  };

  const handleAnalyzeWidget = async (widgetId: string) => {
    setIsAnalyzing(true);
    setAnalysisData(null);
    try {
      const res = await apiFetch(`/dashboard/widget/${widgetId}/analyze`, { method: "POST", auth: true });
      setAnalysisData(res);
    } catch (e) {
      setAnalysisData({ analysis: "Failed to analyze." });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDownloadWidget = async (widget: any, format: any) => {
    try {
      // Get Data & Fresh Analysis for robust report
      const [dataRes, analysisRes] = await Promise.all([
        apiFetch(`/dashboard/widget/${widget.id}/data`, { auth: true }),
        apiFetch(`/dashboard/widget/${widget.id}/analyze`, { method: "POST", auth: true }).catch(() => null)
      ]);

      await downloadResults(format, dataRes.data, analysisRes, widget.title, `widget-${widget.id}`);
    } catch (e) {
      alert("Download failed");
    }
    setOpenWidgetMenuId(null);
  };

  const copyAnalysis = () => {
    if (!analysisData) return;
    const text = `${analysisData.analysis}\n\nAnomalies:\n${analysisData.anomalies?.join('\n')}\n\nRecommendations:\n${analysisData.recommendations?.join('\n')}`;
    navigator.clipboard.writeText(text);
    alert("Copied!");
  };

  const filteredDashboards = dashboards.filter(d =>
    d.Name.toLowerCase().includes(filterText.toLowerCase())
  );

  return (
    <ProtectedClient>
      <div className="flex min-h-screen bg-slate-950 text-slate-200">
        <Sidebar />
        <div className="flex flex-1 flex-col">
          <Topbar />
          <main className="flex-1 p-6">

            {/* LIST VIEW */}
            {!activeDashboard && (
              <div className="space-y-6 animate-in fade-in duration-500">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-bold text-white">Dashboards</h1>
                    <input
                      placeholder="Filter dashboards..."
                      className="bg-slate-900 border border-slate-700 rounded-full px-4 py-1.5 text-sm outline-none focus:border-brand w-64 transition-all"
                      value={filterText}
                      onChange={e => setFilterText(e.target.value)}
                    />
                  </div>
                  <Button onClick={createDashboard}>+ New Dashboard</Button>
                </div>

                {loading ? <div className="text-slate-500 text-sm">Loading...</div> : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredDashboards.map((d) => (
                      <div
                        key={d.Id}
                        onClick={() => loadDashboard(d.Id)}
                        className="group relative h-48 rounded-xl border border-slate-800 bg-slate-900/50 p-6 hover:border-brand hover:bg-slate-900 cursor-pointer transition-all hover:shadow-xl flex flex-col justify-between"
                      >
                        <div>
                          <h3 className="font-bold text-lg text-slate-100 mb-2 truncate">{d.Name}</h3>
                          <div className="text-xs text-slate-500">Created: {new Date(d.CreatedAt).toLocaleDateString()}</div>
                        </div>
                        <div className="absolute top-4 right-4">
                          <button
                            onClick={(e) => { e.stopPropagation(); setOpenDashMenuId(openDashMenuId === d.Id ? null : d.Id); }}
                            className="p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 z-10"
                          >
                            ⋮
                          </button>
                          {openDashMenuId === d.Id && (
                            <div className="absolute right-0 mt-2 w-32 bg-slate-800 border border-slate-700 rounded shadow-xl z-20 overflow-hidden">
                              <button onClick={(e) => handleDeleteDashboard(e, d.Id)} className="w-full text-left px-4 py-2 text-xs text-red-400 hover:bg-slate-700">Delete</button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ACTIVE VIEW */}
            {activeDashboard && (
              <div className="space-y-6 animate-in slide-in-from-right-4">
                <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-4">
                    <button onClick={() => setActiveDashboard(null)} className="text-sm text-slate-400 hover:text-white">← Back</button>
                    <h1 className="text-xl font-bold text-white">{activeDashboard.name}</h1>
                  </div>
                  <div className="flex gap-2">
                    {isEditing ? (
                      <>
                        <Button variant="ghost" onClick={() => { setIsEditing(false); loadDashboard(activeDashboard.id!); }}>Cancel</Button>
                        <Button onClick={saveLayout} className="bg-emerald-600">Save Layout</Button>
                      </>
                    ) : (
                      <Button variant="secondary" onClick={() => setIsEditing(true)}>Edit Layout</Button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-10">
                  {activeDashboard.widgets.map((w, idx) => (
                    <div key={`${w.id}-${idx}`} id={`widget-${w.id}`} className={`flex flex-col relative transition-all ${w.colSpan === 2 ? 'md:col-span-2' : w.colSpan === 3 ? 'md:col-span-3' : ''}`}>
                      <WidgetCard title={w.title}>
                        <DashboardWidgetRenderer widget={w} />
                      </WidgetCard>

                      {isEditing ? (
                        <div className="absolute top-2 right-2 flex gap-1 z-50">
                          <button onClick={(e) => { e.stopPropagation(); toggleWidgetSize(w.id); }} className="bg-slate-800 text-white text-[10px] px-2 py-1 rounded border border-slate-600">Resize</button>
                          <button onClick={(e) => { e.stopPropagation(); removeWidget(w.id); }} className="bg-red-900/80 text-white text-[10px] px-2 py-1 rounded border border-red-700">✕</button>
                        </div>
                      ) : (
                        <div className="absolute top-3 right-3 z-50">
                          <button onClick={(e) => { e.stopPropagation(); setOpenWidgetMenuId(openWidgetMenuId === w.id ? null : w.id); }} className="p-1 text-slate-300 hover:text-white rounded-full bg-slate-900/80 shadow-sm border border-slate-700/50">⋮</button>
                          {openWidgetMenuId === w.id && (
                            <div className="absolute right-0 mt-2 w-40 bg-slate-900 border border-slate-700 rounded shadow-xl z-50 overflow-hidden">
                              <button onClick={(e) => { e.stopPropagation(); handleAnalyzeWidget(w.id); setOpenWidgetMenuId(null); }} className="w-full text-left px-4 py-2 text-xs hover:bg-slate-800 text-brand">✨ Analyze</button>

                              {/* DOWNLOAD SUBMENU */}
                              <div className="relative group">
                                <button className="w-full text-left px-4 py-2 text-xs text-slate-300 hover:bg-slate-800 flex justify-between">
                                  <span>⬇ Download</span>
                                  <span>▸</span>
                                </button>
                                <div className="hidden group-hover:block absolute right-full top-0 w-24 bg-slate-900 border border-slate-700 rounded shadow-xl">
                                  {['csv', 'xlsx', 'pdf', 'png'].map(fmt => (
                                    <button key={fmt} onClick={(e) => { e.stopPropagation(); handleDownloadWidget(w, fmt); }} className="w-full text-left px-4 py-2 text-xs text-slate-300 hover:bg-slate-800 uppercase">{fmt}</button>
                                  ))}
                                </div>
                              </div>

                              <button onClick={(e) => { e.stopPropagation(); removeWidget(w.id); }} className="w-full text-left px-4 py-2 text-xs text-red-400 hover:bg-slate-800">Delete</button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ANALYSIS MODAL */}
            {(isAnalyzing || analysisData) && (
              <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-200">
                <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl flex flex-col max-h-[80vh]">
                  <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2"><span>✨</span> AI Analysis</h3>
                    <button onClick={() => setAnalysisData(null)} className="text-slate-400 hover:text-white">✕</button>
                  </div>

                  <div className="p-6 overflow-y-auto flex-1 space-y-4">
                    {isAnalyzing ? (
                      <div className="flex flex-col items-center justify-center h-40 space-y-4">
                        <div className="animate-spin h-8 w-8 border-4 border-brand border-t-transparent rounded-full"></div>
                        <p className="text-slate-400 animate-pulse">Generating insights...</p>
                      </div>
                    ) : (
                      <>
                        <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-800 text-slate-300 leading-relaxed">{analysisData.analysis}</div>
                        {analysisData.anomalies?.length > 0 && (
                          <div>
                            <h4 className="text-xs font-bold uppercase text-red-400 mb-2">Anomalies</h4>
                            <ul className="space-y-1">{analysisData.anomalies.map((a: any, i: number) => <li key={i} className="text-sm text-red-200 bg-red-900/20 p-2 rounded border border-red-900/50">⚠️ {a}</li>)}</ul>
                          </div>
                        )}
                        {analysisData.recommendations?.length > 0 && (
                          <div>
                            <h4 className="text-xs font-bold uppercase text-emerald-400 mb-2">Recommendations</h4>
                            <ul className="space-y-1">{analysisData.recommendations.map((r: any, i: number) => <li key={i} className="text-sm text-emerald-200 bg-emerald-900/20 p-2 rounded border border-emerald-900/50">💡 {r}</li>)}</ul>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <div className="p-4 border-t border-slate-800 flex justify-end gap-2 bg-slate-900 rounded-b-xl">
                    <Button variant="ghost" onClick={() => setAnalysisData(null)}>Close</Button>
                    <Button onClick={copyAnalysis} disabled={isAnalyzing}>Copy Analysis</Button>
                  </div>
                </div>
              </div>
            )}

          </main>
        </div>
      </div>
    </ProtectedClient>
  );
}