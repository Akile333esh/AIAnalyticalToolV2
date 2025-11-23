import axios from "axios";
import { config } from "../config/env";

// Define the interface for the analysis payload
interface AnalyzePayload {
  rows: any[];
  columns?: string[];
  query?: string;
  sql?: string;
  metadata?: any;
}

export async function generateSql(payload: any) {
  const res = await axios.post(
    `${config.AI_BACKEND_URL}/v1/generate_sql`,
    payload,
    { timeout: 600000 }
  );
  return res.data;
}

// ✅ NEW: Function to call the analysis endpoint
export async function analyzeResults(payload: AnalyzePayload) {
  try {
    const res = await axios.post(
      `${config.AI_BACKEND_URL}/v1/analyze_results`,
      payload,
      { timeout: 600000 } // Give it time to think (60s)
    );
    return res.data;
  } catch (error) {
    console.error("Analysis failed:", error);
    return { 
      analysis: "Failed to generate analysis.", 
      anomalies: [], 
      recommendations: [] 
    };
  }
}