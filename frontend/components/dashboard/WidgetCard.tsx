import type { ReactNode } from "react";
import { Card } from "../ui/Card";

interface WidgetCardProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export function WidgetCard({ title, children, className }: WidgetCardProps) {
  return (
    <Card className={`flex flex-col h-full overflow-hidden border-slate-800 bg-slate-900/40 shadow-sm ${className || ""}`}>
      <div className="border-b border-slate-800 px-4 py-3 bg-slate-900/60">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 truncate" title={title}>
          {title}
        </h3>
      </div>
      <div className="flex-1 overflow-hidden relative min-h-[150px]">
        {children}
      </div>
    </Card>
  );
}
