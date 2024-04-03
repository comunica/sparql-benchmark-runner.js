/**
 * Result metadata.
 */
export type IResultMetadata = Record<string, any>;

/**
 * Result for a single query.
 */
export interface IResult extends IResultMetadata {
  name: string;
  id: string;
  resultCount: number;
  resultHash: string;
  duration: number;
  timestamps: number[];
  error?: Error;
}

/**
 * Aggregate result for multiple executions of a query.
 */
export interface IAggregateResult extends IResult {
  resultCountMin: number;
  resultCountMax: number;
  durationMin: number;
  durationMax: number;
  timestampsMin: number[];
  timestampsMax: number[];
  replication: number;
  failures: number;
}
