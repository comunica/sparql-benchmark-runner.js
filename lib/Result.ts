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
  // Minimum number of results across repetitions.
  resultsMin: number;

  // Maximum number of results across repetitions.
  resultsMax: number;

  // Minimum query execution time across repetitions.
  timeMin: number;

  // Maximum query execution time across repetitions.
  timeMax: number;

  // Standard deviation of execution times across repetitions.
  timeStd: number;

  // The query execution times for each repetition.
  times: number[];

  // Average result arrival timestamps.
  timestamps: number[];

  // Minimum result arrival timestamps across repetitions.
  timestampsMin: number[];

  // Maximum result arrival timestamps across repetitions.
  timestampsMax: number[];

  // Standard deviation of result arrival timestamps across repetitions.
  timestampsStd: number[];

  // Number of times the query was executed.
  replication: number;

  // Number of failed repetitions.
  failures: number;

  // Raw timestamps for all repetitions, preserving individual result arrival times.
  timestampsAll?: number[][];
}
