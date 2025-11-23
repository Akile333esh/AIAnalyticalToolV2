const FORBIDDEN_KEYWORDS = [
  "INSERT",
  "UPDATE",
  "DELETE",
  "MERGE",
  "ALTER",
  "DROP",
  "TRUNCATE",
  "EXEC",
  "EXECUTE",
  "CREATE",
  "GRANT",
  "REVOKE",
  "BACKUP",
  "RESTORE",
  "INTO",   // Prevents SELECT INTO (table creation)
  "PRAGMA",
  "DBCC",
  "DENY"
];

/**
 * Cleans up the raw output from the LLM.
 * Removes Markdown code fences (```sql ... ```) and extraneous text.
 */
export function normalizeGeneratedSql(raw: string): string {
  if (!raw) return "";
  
  let sql = raw.trim();

  // 1. Remove Markdown code blocks if present
  // Matches ```sql ... ``` or just ``` ... ```
  const codeBlockRegex = /```(?:sql)?\s*([\s\S]*?)\s*```/i;
  const match = sql.match(codeBlockRegex);
  if (match && match[1]) {
    sql = match[1].trim();
  }

  // 2. Ensure we only grab the SQL part if there is conversational text before it
  // Finds the first occurrence of "SELECT" or "WITH" and ignores everything before it
  const upper = sql.toUpperCase();
  const selectIdx = upper.indexOf("SELECT");
  const withIdx = upper.indexOf("WITH");

  let startIdx = -1;
  if (selectIdx !== -1 && (withIdx === -1 || selectIdx < withIdx)) {
    startIdx = selectIdx;
  } else if (withIdx !== -1) {
    startIdx = withIdx;
  }

  if (startIdx > 0) {
    sql = sql.substring(startIdx);
  }

  return sql;
}

/**
 * Checks if the SQL is a read-only SELECT statement.
 * Returns true if safe, false otherwise.
 */
export function isSqlSafe(sql: string): boolean {
  const upper = sql.toUpperCase().trim();

  // 1. Must start with SELECT or WITH (Common Table Expression)
  if (!upper.startsWith("SELECT") && !upper.startsWith("WITH")) {
    return false;
  }

  // 2. Check for Forbidden Keywords
  for (const kw of FORBIDDEN_KEYWORDS) {
    // Use word boundaries (\b) to avoid false positives like "UPDATE_DATE" column
    const regex = new RegExp(`\\b${kw}\\b`, 'i');
    if (regex.test(sql)) {
      return false;
    }
  }

  return true;
}

/**
 * Throws an error if the SQL is deemed unsafe.
 * Used by the Job Processor to halt execution.
 */
export function ensureSqlIsSafe(sql: string): void {
  if (!isSqlSafe(sql)) {
    throw new Error("Safety Violation: Generated SQL contains forbidden keywords (DML/DDL) or does not start with SELECT.");
  }
}