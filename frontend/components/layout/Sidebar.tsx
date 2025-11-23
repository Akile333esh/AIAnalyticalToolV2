"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { label: "Workspace", href: "/" },
    { label: "Dashboards", href: "/dashboard" },
    // { label: "Reports", href: "/reports" }, // Add back if using reports
  ];

  return (
    <aside className="hidden w-64 flex-col border-r border-slate-800 bg-slate-950 md:flex">
      <div className="flex h-14 items-center border-b border-slate-800 px-6">
        <div className="flex items-center gap-2 font-bold text-slate-100">
          <div className="h-6 w-6 rounded-full bg-brand" />
          <span>AI Analytics</span>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-brand/10 text-brand"
                  : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-800 p-4">
        <div className="text-xs text-slate-600">
          v1.0.0 &bull; Connected to AnalyticsDB
        </div>
      </div>
    </aside>
  );
}
