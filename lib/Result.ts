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
  results: number;
  hash: string;
  time: number;
  timestamps: number[];
  error?: Error;
}

/**
 * Aggregate result for multiple executions of a query.
 */
export interface IAggregateResult extends IResult {
  resultsMin: number;
  resultsMax: number;
  timeMin: number;
  timeMax: number;
  timestampsMin: number[];
  timestampsMax: number[];
  replication: number;
  failures: number;
}
