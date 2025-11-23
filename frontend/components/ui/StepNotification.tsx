"use client";

import { useEffect, useState } from "react";

interface StepNotificationProps {
  message: string;
  status: "loading" | "success" | "error" | "idle";
  onClose?: () => void;
}

export function StepNotification({ message, status, onClose }: StepNotificationProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (status !== "idle") {
      setVisible(true);
    }
    
    // Auto-hide on success/error after 3 seconds
    if (status === "success" || status === "error") {
      const timer = setTimeout(() => {
        setVisible(false);
        if (onClose) setTimeout(onClose, 300); // Allow fade out
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [status, message, onClose]);

  if (!visible && status === "idle") return null;

  return (
    <div 
      className={`fixed top-20 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-2xl border transition-all duration-300 transform ${
        visible ? "translate-x-0 opacity-100" : "translate-x-10 opacity-0 pointer-events-none"
      } ${
        status === "error" ? "bg-red-900/90 border-red-700 text-red-100" : 
        status === "success" ? "bg-emerald-900/90 border-emerald-700 text-emerald-100" : 
        "bg-slate-900/90 border-slate-700 text-slate-200 backdrop-blur-md"
      }`}
    >
      {/* ICON LOGIC */}
      <div className="shrink-0">
        {status === "loading" && (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent text-brand" />
        )}
        {status === "success" && (
          <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )}
        {status === "error" && (
          <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
      </div>

      {/* TEXT CONTENT */}
      <div className="flex flex-col">
        <span className={`text-xs font-bold uppercase tracking-wider ${
          status === "error" ? "text-red-300" : 
          status === "success" ? "text-emerald-300" : 
          "text-slate-500"
        }`}>
          {status === "loading" ? "Processing..." : status === "success" ? "Complete" : "Error"}
        </span>
        <span className="text-sm font-medium max-w-[250px] truncate">
          {message}
        </span>
      </div>

      {/* CLOSE BUTTON */}
      <button 
        onClick={() => setVisible(false)}
        className="ml-2 p-1 hover:bg-white/10 rounded-full transition-colors"
      >
        <svg className="h-4 w-4 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}