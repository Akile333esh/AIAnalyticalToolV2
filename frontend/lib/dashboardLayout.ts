import type { DashboardLayout } from "./types";

export const DEFAULT_LAYOUT: DashboardLayout = {
  widgets: [
    {
      id: "cpu_30d",
      title: "CPU utilization (last 30 days by server)",
      type: "timeseries"
    },
    {
      id: "memory_30d",
      title: "Memory utilization (last 30 days by server)",
      type: "timeseries"
    },
    {
      id: "disk_usage",
      title: "Disk utilization (top instances, last 7 days)",
      type: "table"
    }
  ]
};

export function normalizeLayoutResponse(res: any): DashboardLayout {
  if (!res) return DEFAULT_LAYOUT;

  // Case 1: { layout: { widgets: [...] } }
  if ("layout" in res && res.layout && Array.isArray(res.layout.widgets)) {
    return res.layout as DashboardLayout;
  }

  // Case 2: { LayoutJson: '...json...' }
  if ("LayoutJson" in res && typeof res.LayoutJson === "string") {
    try {
      const parsed = JSON.parse(res.LayoutJson);
      if (parsed && Array.isArray(parsed.widgets)) {
        return parsed as DashboardLayout;
      }
    } catch {
      // ignore parse error; fall back
    }
  }

  // Case 3: response itself looks like layout
  if (Array.isArray(res.widgets)) {
    return res as DashboardLayout;
  }

  return DEFAULT_LAYOUT;
}
