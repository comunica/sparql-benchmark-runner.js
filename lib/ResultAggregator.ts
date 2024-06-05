import type { IResult, IAggregateResult } from './Result';

export class ResultAggregator implements IResultAggregator {
  /**
   * Groups query execution results by name and id.
   * @param results Ungrouped results.
   * @returns Grouped results.
   */
  public groupResults(results: IResult[]): Record<string, IResult[]> {
    const groups: Record<string, IResult[]> = {};
    for (const result of results) {
      const key = `${result.name}:${result.id}`;
      if (key in groups) {
        groups[key].push(result);
      } else {
        groups[key] = [ result ];
      }
    }
    return groups;
  }

  /**
   * Produces aggregated query results from already grouped results.
   * @param results Execution results grouped by query.
   * @returns Aggregate results per query.
   */
  public aggregateGroupedResults(results: Record<string, IResult[]>): IAggregateResult[] {
    const aggregates: IAggregateResult[] = [];
    for (const resultGroup of Object.values(results)) {
      const aggregate: IAggregateResult = {
        name: resultGroup[0].name,
        id: resultGroup[0].id,
        time: 0,
        timeMax: Number.NEGATIVE_INFINITY,
        timeMin: Number.POSITIVE_INFINITY,
        failures: 0,
        replication: resultGroup.length,
        results: 0,
        resultsMax: Number.NEGATIVE_INFINITY,
        resultsMin: Number.POSITIVE_INFINITY,
        hash: '',
        timestamps: [],
        timestampsMax: [],
        timestampsMin: [],
      };
      let inconsistentResults = false;
      let successfulExecutions = 0;
      const timestampsAll: number[][] = [];
      // Track max number of timestamps for averaging of timestamps later
      let maxNumTimestamp = 0;
      for (const result of resultGroup) {
        if (result.error) {
          aggregate.error = result.error;
          aggregate.failures++;
          // If no results and error we don't register
          if (result.timestamps.length === 0) {
            continue;
          }
        } else {
          successfulExecutions++;
          aggregate.time += result.time;
          aggregate.results += result.results;
          aggregate.resultsMax = Math.max(aggregate.resultsMax, result.results);
          aggregate.resultsMin = Math.min(aggregate.resultsMin, result.results);
          aggregate.timeMax = Math.max(aggregate.timeMax, result.time);
          aggregate.timeMin = Math.min(aggregate.timeMin, result.time);

          // If we haven't registered hash, we do so for full query result
          if (aggregate.hash.length === 0) {
            aggregate.hash = result.hash;
          } else if (aggregate.hash !== result.hash) {
            inconsistentResults = true;
            aggregate.failures++;
          }
        }
        timestampsAll.push(result.timestamps);
        if (result.timestamps.length > maxNumTimestamp) {
          maxNumTimestamp = result.timestamps.length;
        }
      }
      if (inconsistentResults && !aggregate.error) {
        aggregate.error = new Error('Result hash inconsistency');
      }

      if (timestampsAll.length > 0) {
        if (successfulExecutions > 0) {
          aggregate.time /= successfulExecutions;
          aggregate.results /= successfulExecutions;
        }

        const processedTs = this.averageTimeStamps(timestampsAll, maxNumTimestamp);
        aggregate.timestamps = processedTs.averageTs;
        aggregate.timestampsMin = processedTs.minTs;
        aggregate.timestampsMax = processedTs.maxTs;
      }

      // Convert all possible leftover infinity / -infinity back to 0 for backward compatibility
      aggregate.resultsMin = Number.isFinite(aggregate.resultsMin) ? aggregate.resultsMin : 0;
      aggregate.resultsMax = Number.isFinite(aggregate.resultsMax) ? aggregate.resultsMax : 0;
      aggregate.timeMin = Number.isFinite(aggregate.timeMin) ? aggregate.timeMin : 0;
      aggregate.timeMax = Number.isFinite(aggregate.timeMax) ? aggregate.timeMax : 0;

      aggregates.push(aggregate);
    }
    return aggregates;
  }

  public averageTimeStamps(timestampsAll: number[][], maxNumTimestamps: number): IProcessedTimestamps {
    const totalTs: number[] = <number[]> Array.from({ length: maxNumTimestamps }).fill(0);
    const maxTs: number[] = <number[]> Array.from({ length: maxNumTimestamps }).fill(Number.NEGATIVE_INFINITY);
    const minTs: number[] = <number[]> Array.from({ length: maxNumTimestamps }).fill(Number.POSITIVE_INFINITY);
    const nts: number[] = <number[]> Array.from({ length: maxNumTimestamps }).fill(0);

    for (const timestamps of timestampsAll) {
      for (const [ j, ts ] of timestamps.entries()) {
        totalTs[j] += ts;
        maxTs[j] = Math.max(maxTs[j], ts);
        minTs[j] = Math.min(minTs[j], ts);
        nts[j]++;
      }
    }
    return {
      maxTs,
      minTs,
      averageTs: totalTs.map((ts, i) => ts / nts[i]),
    };
  }

  /**
   * Produce aggregated query results from a set of single execution results.
   * @param results Individual query execution results.
   * @returns Aggregated results per individual query.
   */
  public aggregateResults(results: IResult[]): IAggregateResult[] {
    const groupedResults = this.groupResults(results);
    const aggregateResults = this.aggregateGroupedResults(groupedResults);
    return aggregateResults;
  }
}

export interface IResultAggregator {
  aggregateResults: (results: IResult[]) => IAggregateResult[];
}

export interface IProcessedTimestamps {
  maxTs: number[];
  minTs: number[];
  averageTs: number[];
}
