export type UserRole = "user" | "admin";

export interface User {
  userId: number;
  email?: string;
  role: UserRole;
}

// Added 'data' event type
export type JobEventType = "step" | "progress" | "reasoning" | "data" | "done" | "error";

export interface AnalysisResult {
  analysis: string;
  anomalies?: string[];
  recommendations?: string[];
}

export interface JobEvent {
  type: JobEventType;
  message?: string;
  progress?: number;
  sqlQuery?: string;
  sqlExplanation?: string;
  rows?: any[];
  analysis?: AnalysisResult; // ✅ New Field
  error?: string;
}

export interface DashboardWidget {
  id: string;
  title: string;
  type: "kpi" | "timeseries" | "table" | "bar" | "chart";
  colSpan?: number;
}

export interface DashboardLayout {
  id?: number;
  name?: string;
  widgets: DashboardWidget[];
}