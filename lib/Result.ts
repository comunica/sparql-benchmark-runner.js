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
 * timestamps from IResult has the meaning of average timestamps.
 * The timestamps are the arrival of a results of the query whereas the times
 * are the query execution times.
 */
export interface IAggregateResult extends IResult {
  resultsMin: number;
  resultsMax: number;
  timeMin: number;
  timeMax: number;
  timeStd: number;
  times: number[];
  timestamps: number[];
  timestampsMin: number[];
  timestampsMax: number[];
  timestampsStd: number[];
  replication: number;
  failures: number;
  timestampsRaw?: number[][];
}
