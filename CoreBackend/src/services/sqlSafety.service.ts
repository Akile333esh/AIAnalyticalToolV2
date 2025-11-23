// CoreBackend/src/services/sqlSafety.service.ts
import { Parser } from 'node-sql-parser';

export function isSqlSafeSelect(sql: string): boolean {
  const parser = new Parser();
  try {
    const ast = parser.astify(sql);
    
    // Handle array of statements or single statement
    const statements = Array.isArray(ast) ? ast : [ast];

    for (const stmt of statements) {
      // 1. Ensure only SELECT statements are allowed
      if (stmt.type !== 'select') return false;
      
      // 2. (Optional) Check 'from' clause to whitelist tables
      // ... additional checks here
    }
    return true;
  } catch (err) {
    console.warn("SQL Parse Error:", err);
    return false; // If we can't parse it, it's not safe
  }
}
