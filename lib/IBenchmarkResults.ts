/**
 * Results for all queries in a query set.
 * Maps query set name to the query result.
 */
export type IBenchmarkResults = Record<string, IBenchmarkResult>;

/**
 * Result for a single query.
 */
export interface IBenchmarkResult {
  name: string;
  id: string;
  count: number;
  time: number;
  timestamps: number[];
}
