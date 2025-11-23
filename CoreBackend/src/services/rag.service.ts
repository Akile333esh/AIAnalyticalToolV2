import sql from "mssql";
import { getRagPool } from "../db/ragDb";

export async function getRagMetadataForQuery(_nlQuery: string) {
  // For now, return all Cpu/Memory/Disk related tables/columns/joins.
  // Later, this can be turned into a proper semantic search.
  const pool = await getRagPool();

  const tablesResult = await pool
    .request()
    .query(
      "SELECT Id, SchemaName, TableName, Description FROM Tables WHERE TableName IN ('CpuPerformance','MemoryPerformance','DiskPerformance')"
    );

  const tableIds = tablesResult.recordset.map((t) => t.Id);
  if (tableIds.length === 0) {
    return {
      tables: [],
      columns: [],
      joins: [],
      tags: [],
      examples: [],
    };
  }

  const idsCsv = tableIds.join(",");

  const columnsResult = await pool
    .request()
    .query(
      `SELECT t.SchemaName, t.TableName, c.ColumnName, c.DataType, c.IsNullable, c.Description
       FROM Columns c
       JOIN Tables t ON t.Id = c.TableId
       WHERE c.TableId IN (${idsCsv})`
    );

  const joinsResult = await pool
    .request()
    .query(
      `SELECT j.FromTableId, j.FromColumn, j.ToTableId, j.ToColumn, j.JoinType,
              t1.SchemaName AS FromSchema, t1.TableName AS FromTable,
              t2.SchemaName AS ToSchema, t2.TableName AS ToTable
       FROM Joins j
       JOIN Tables t1 ON j.FromTableId = t1.Id
       JOIN Tables t2 ON j.ToTableId = t2.Id
       WHERE j.FromTableId IN (${idsCsv}) OR j.ToTableId IN (${idsCsv})`
    );

  return {
    tables: tablesResult.recordset,
    columns: columnsResult.recordset,
    joins: joinsResult.recordset,
    tags: [],
    examples: [],
  };
}
