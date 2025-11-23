import { getRagPool } from "../db/ragDb";

// Define the interface matching the Python RAGMetadata model
export interface RAGMetadata {
  tables: any[];
  columns: any[];
  joins: any[];
  tags: any[];
  examples: any[];
}

export async function getRagMetadata(userId?: number): Promise<RAGMetadata> {
  const pool = await getRagPool();
  
  // 1. Fetch Tables
  // We fetch tables that are 'active' or visible.
  const tablesRes = await pool.request().query(`
    SELECT SchemaName as [schema], TableName as [name], Description as [description]
    FROM RagTables
    WHERE IsActive = 1
  `);

  // 2. Fetch Columns
  const columnsRes = await pool.request().query(`
    SELECT 
      TableSchema as [table_schema], 
      TableName as [table_name], 
      ColumnName as [name], 
      DataType as [data_type], 
      Description as [description]
    FROM RagColumns
    WHERE IsActive = 1
  `);

  // 3. Fetch Joins (Crucial for correct SQL generation)
  const joinsRes = await pool.request().query(`
    SELECT 
      FromTableSchema as [from_table_schema],
      FromTableName as [from_table_name],
      FromColumn as [from_column],
      ToTableSchema as [to_table_schema],
      ToTableName as [to_table_name],
      ToColumn as [to_column],
      JoinType as [join_type]
    FROM RagJoins
    WHERE IsActive = 1
  `);

  // 4. Fetch Semantic Tags (Optional, helps AI understand synonyms like "usage" vs "utilization")
  const tagsRes = await pool.request().query(`
    SELECT TargetType as [target_type], Target as [target], Tag as [tag], Weight as [weight]
    FROM RagSemanticTags
  `);

  return {
    tables: tablesRes.recordset,
    columns: columnsRes.recordset,
    joins: joinsRes.recordset,
    tags: tagsRes.recordset,
    examples: [] // You can also add a query for RagExamples here
  };
}