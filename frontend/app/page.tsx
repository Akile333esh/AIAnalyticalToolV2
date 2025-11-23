"use client";

import { useState, useRef, useEffect } from "react";
import { apiFetch, API_BASE_URL } from "@/lib/apiClient";
import { getAccessToken } from "@/lib/auth";
import { ProtectedClient } from "@/components/auth/ProtectedClient";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StepNotification } from "@/components/ui/StepNotification";
import { downloadResults } from "@/lib/downloadUtils";
import type { AnalysisResult } from "@/lib/types";

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  
  // Job Control
  const [isCancellable, setIsCancellable] = useState(true);

  // Notification State
  const [notifyStatus, setNotifyStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [notifyMessage, setNotifyMessage] = useState("");

  // Data State
  const [results, setResults] = useState<any[] | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "chart">("table");

  // Download State
  const [isDownloading, setIsDownloading] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);

  // Dashboard Save State
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [dashboards, setDashboards] = useState<any[]>([]);
  const [selectedDashId, setSelectedDashId] = useState<number | null>(null);
  const [generatedSql, setGeneratedSql] = useState<string | null>(null);
  const [widgetName, setWidgetName] = useState("");

  const logsEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events]);

  const runJob = async () => {
    setIsModalOpen(true);
    setEvents([]);
    setResults(null);
    setAnalysis(null);
    setGeneratedSql(null);
    
    // Reset States
    setIsCancellable(true);
    setNotifyStatus("loading");
    setNotifyMessage("Initializing job...");
    
    try {
      const job = await apiFetch("/jobs", {
        method: "POST",
        auth: true,
        body: JSON.stringify({ naturalLanguageQuery: query })
      });
      setJobId(job.jobId);
      startStream(job.jobId, job.jobToken);
    } catch (e: any) {
      console.error(e);
      setNotifyStatus("error");
      setNotifyMessage(e.message || "Failed to start job");
    }
  };

  const startStream = async (id: string, token: string) => {
    const accessToken = getAccessToken();
    const url = `${API_BASE_URL}/v2/jobs/${id}/stream?t=${token}`;
    const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` }});
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) return;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      const lines = chunk.split("\n\n");
      
      for (const line of lines) {
        if (line.startsWith("data:")) {
          try {
            const data = JSON.parse(line.replace("data: ", ""));
            
            if (data.type !== 'data') setEvents(prev => [...prev, data]);

            // Update Notification & Cancel State
            if (data.sqlQuery || (data.message && data.message.toLowerCase().includes("executing"))) {
                setIsCancellable(false);
            }
            if (data.message) {
                setNotifyMessage(data.message);
                setNotifyStatus("loading"); // Keep visible
            }
            if (data.sqlQuery) setGeneratedSql(data.sqlQuery);
            
            if (data.type === "data" && data.rows) {
                setResults(data.rows);
            }

            if (data.type === "done") {
               setNotifyStatus("success");
               setNotifyMessage("Analysis complete.");
               if (data.rows) setResults(data.rows);
               if (data.analysis) setAnalysis(data.analysis);
               setWidgetName(query.substring(0, 30) + "...");
               setIsCancellable(false);
            }
            
            if (data.type === "error") {
               setNotifyStatus("error");
               setNotifyMessage(data.message || "An error occurred");
               setIsCancellable(false);
            }

          } catch (e) { console.error(e); }
        }
      }
    }
  };

  const cancelJob = async () => {
    if (jobId && isCancellable) {
      await apiFetch(`/jobs/${jobId}/cancel`, { method: "POST", auth: true });
      setJobId(null);
      setIsModalOpen(false);
      setNotifyStatus("error");
      setNotifyMessage("Job cancelled by user.");
    }
  };
  
  const loadDashboards = async () => {
      const data = await apiFetch("/dashboard/list", { auth: true });
      setDashboards(data);
      setIsSaveModalOpen(true);
  };

  const saveToDashboard = async () => {
      if(!selectedDashId || !generatedSql) return;
      try {
          const widgetRes = await apiFetch("/dashboard/widget", {
              method: "POST",
              auth: true,
              body: JSON.stringify({ name: widgetName, type: viewMode, sqlQuery: generatedSql })
          });
          const dash = await apiFetch(`/dashboard/${selectedDashId}`, { auth: true });
          const updatedLayout = { widgets: [...dash.widgets, { id: widgetRes.widgetId.toString(), title: widgetName, type: viewMode, colSpan: 1 }] };
          await apiFetch(`/dashboard/${selectedDashId}`, { method: "PUT", auth: true, body: JSON.stringify({ layout: updatedLayout }) });
          setIsSaveModalOpen(false);
          alert("Saved!");
      } catch(e) { alert("Save failed"); }
  };

  const handleDownload = async (format: 'csv' | 'xlsx' | 'pdf' | 'png') => {
    if (!results) return;
    setIsDownloading(true);
    setShowDownloadMenu(false);
    try {
        // Using results-container ID for PNG capture context
        await downloadResults(format, results, analysis, "Analysis_Report", "results-container");
    } catch (e) {
        console.error(e);
        alert("Download failed.");
    } finally {
        setIsDownloading(false);
    }
  };

  return (
    <ProtectedClient>
      <div className="flex min-h-screen bg-slate-950 text-slate-200">
        <Sidebar />
        
        <StepNotification 
            status={notifyStatus} 
            message={notifyMessage} 
            onClose={() => setNotifyStatus("idle")}
        />

        <div className="flex flex-1 flex-col">
          <Topbar />
          <main className="flex-1 p-6">
            <div className="mx-auto max-w-7xl space-y-6">
              
              <Card className="p-1 border-slate-800 bg-slate-900/50 shadow-xl">
                <div className="relative">
                  <textarea 
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-4 text-white focus:ring-2 focus:ring-brand outline-none min-h-[100px] resize-none"
                    placeholder="Ask about your infrastructure (e.g., 'Show monthly memory usage for SRV-01 in 2025')"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  <div className="absolute bottom-4 right-4">
                    <Button onClick={runJob}>Generate Report</Button>
                  </div>
                </div>
              </Card>

              {results && (
                <div id="results-container" className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 bg-slate-950 p-2 rounded-xl">
                  
                  {/* LEFT: DATA */}
                  <Card className="p-0 overflow-hidden border-slate-800 h-full flex flex-col">
                    <div className="bg-slate-900/80 border-b border-slate-800 p-3 flex justify-between items-center">
                      <div className="flex gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                        <button onClick={() => setViewMode("table")} className={`px-3 py-1 text-xs rounded ${viewMode === "table" ? "bg-slate-800 text-white" : "text-slate-400"}`}>Table</button>
                        <button onClick={() => setViewMode("chart")} className={`px-3 py-1 text-xs rounded ${viewMode === "chart" ? "bg-slate-800 text-white" : "text-slate-400"}`}>Chart</button>
                      </div>
                      <div className="flex gap-2">
                         <div className="relative">
                            <Button variant="secondary" size="sm" onClick={() => setShowDownloadMenu(!showDownloadMenu)}>
                                {isDownloading ? "..." : "Download ▼"}
                            </Button>
                            {showDownloadMenu && (
                                <div className="absolute right-0 mt-2 w-32 bg-slate-800 border border-slate-700 rounded shadow-xl z-50 overflow-hidden">
                                    {['csv','xlsx','pdf','png'].map(fmt => (
                                        <button 
                                            key={fmt}
                                            onClick={() => handleDownload(fmt as any)}
                                            className="w-full text-left px-4 py-2 text-xs text-slate-300 hover:bg-slate-700 uppercase"
                                        >
                                            {fmt}
                                        </button>
                                    ))}
                                </div>
                            )}
                         </div>
                         <Button onClick={loadDashboards} variant="outline" size="sm">+ Save</Button>
                      </div>
                    </div>
                    
                    <div className="p-4 bg-slate-950/50 flex-1 min-h-[300px] overflow-auto">
                      {viewMode === "table" ? (
                        <table className="w-full text-left text-sm text-slate-400">
                          <thead className="bg-slate-900 text-slate-200 sticky top-0">
                            <tr>{Object.keys(results[0] || {}).map(k => <th key={k} className="p-3 border-b border-slate-700">{k}</th>)}</tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800">
                            {results.map((row, i) => (
                              <tr key={i} className="hover:bg-slate-900/50">
                                {Object.values(row).map((v: any, j) => <td key={j} className="p-3 font-mono text-xs">{String(v)}</td>)}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <div className="h-full flex items-end justify-center gap-2">
                           {results.slice(0, 30).map((row, i) => {
                             const val = Object.values(row).find(v => typeof v === 'number') as number || 0;
                             return <div key={i} className="flex-1 bg-brand/80 rounded-t-sm min-w-[4px]" style={{ height: `${Math.min(val, 100)}%` }} />
                           })}
                        </div>
                      )}
                    </div>
                  </Card>

                  {/* RIGHT: ANALYSIS */}
                  <Card className="h-full border-slate-800 bg-slate-900/40 p-5 space-y-5 flex flex-col">
                    <h3 className="font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                      <span className="text-xl">✨</span> AI Insights
                    </h3>
                    
                    {!analysis ? (
                      <div className="flex-1 flex items-center justify-center text-sm text-slate-500 animate-pulse">
                          Analyzing data patterns...
                      </div>
                    ) : (
                      <div className="space-y-6 text-sm overflow-y-auto max-h-[500px] pr-2">
                        <div className="text-slate-300 leading-relaxed">{analysis.analysis}</div>
                        {analysis.anomalies && analysis.anomalies.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-red-400">Anomalies</h4>
                            <ul className="space-y-1">
                              {analysis.anomalies.map((item, i) => <li key={i} className="flex gap-2 text-red-200/80 bg-red-900/10 p-2 rounded border border-red-900/30"><span>⚠️</span> {item}</li>)}
                            </ul>
                          </div>
                        )}
                        {analysis.recommendations && analysis.recommendations.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">Recommendations</h4>
                            <ul className="space-y-1">
                              {analysis.recommendations.map((item, i) => <li key={i} className="flex gap-2 text-emerald-200/80 bg-emerald-900/10 p-2 rounded border border-emerald-900/30"><span>💡</span> {item}</li>)}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                </div>
              )}
            </div>
          </main>
        </div>

        {/* STATUS MODAL */}
        {isModalOpen && !results && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-40">
             <Card className="w-[400px] p-0 overflow-hidden border-brand/30 shadow-2xl">
               <div className="bg-slate-900 p-4 border-b border-slate-800">
                 <h3 className="text-lg font-semibold text-white animate-pulse">AI is working...</h3>
               </div>
               <div className="bg-slate-950 p-4 min-h-[150px] max-h-[300px] overflow-y-auto font-mono text-xs space-y-2">
                 {events.map((e, i) => <div key={i} className="border-l-2 border-slate-800 pl-3 py-1"><span className="text-brand uppercase">{e.type}</span>: {e.message}</div>)}
                 <div ref={logsEndRef} />
               </div>
               <div className="p-3 bg-slate-900 border-t border-slate-800">
                  <Button 
                    onClick={cancelJob} 
                    variant="destructive" 
                    className="w-full"
                    disabled={!isCancellable}
                  >
                    {isCancellable ? "Cancel Job" : "Processing..."}
                  </Button>
               </div>
             </Card>
          </div>
        )}
        
        {/* SAVE MODAL */}
        {isSaveModalOpen && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <Card className="w-96 p-6 space-y-4">
              <h3 className="text-lg font-semibold text-white">Save Widget</h3>
              <input className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm" value={widgetName} onChange={e => setWidgetName(e.target.value)} placeholder="Widget Name" />
              <div className="space-y-1 max-h-40 overflow-y-auto">
                 {dashboards.map(d => (
                   <div key={d.Id} onClick={() => setSelectedDashId(d.Id)} className={`p-2 rounded text-sm cursor-pointer border ${selectedDashId === d.Id ? "border-brand bg-brand/10 text-brand" : "border-slate-700 hover:bg-slate-800 text-slate-300"}`}>{d.Name}</div>
                 ))}
              </div>
              <div className="flex gap-2 justify-end mt-4">
                <Button variant="ghost" onClick={() => setIsSaveModalOpen(false)}>Cancel</Button>
                <Button onClick={saveToDashboard} disabled={!selectedDashId || !widgetName}>Save</Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </ProtectedClient>
  );
}