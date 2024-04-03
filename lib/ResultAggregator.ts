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
        duration: 0,
        durationMax: 0,
        durationMin: 0,
        failures: 0,
        replication: resultGroup.length,
        resultCount: 0,
        resultCountMax: 0,
        resultCountMin: 0,
        resultHash: '',
        timestamps: [],
        timestampsMax: [],
        timestampsMin: [],
      };
      let inconsistentResults = false;
      let successfulExecutions = 0;
      const timestampDivisors: number[] = [];
      for (const result of resultGroup) {
        if (result.error) {
          aggregate.error = result.error;
          aggregate.failures++;
        } else if (aggregate.resultHash.length === 0) {
          // Update the aggregate based on the first successful result
          successfulExecutions++;
          aggregate.duration = result.duration;
          aggregate.durationMax = result.duration;
          aggregate.durationMin = result.duration;
          aggregate.resultCount = result.resultCount;
          aggregate.resultCountMax = result.resultCount;
          aggregate.resultCountMin = result.resultCount;
          aggregate.resultHash = result.resultHash;
          for (const ts of result.timestamps) {
            timestampDivisors.push(1);
            aggregate.timestamps.push(ts);
            aggregate.timestampsMax.push(ts);
            aggregate.timestampsMin.push(ts);
          }
        } else {
          successfulExecutions++;
          aggregate.duration += result.duration;
          aggregate.durationMax = Math.max(aggregate.durationMax, result.duration);
          aggregate.durationMin = Math.min(aggregate.durationMin, result.duration);
          aggregate.resultCount += result.resultCount;
          aggregate.resultCountMax = Math.max(aggregate.resultCountMax, result.resultCount);
          aggregate.resultCountMin = Math.min(aggregate.resultCountMin, result.resultCount);
          if (aggregate.resultHash !== result.resultHash && !aggregate.error) {
            inconsistentResults = true;
            aggregate.failures++;
          }
          for (const [ index, timestamp ] of result.timestamps.entries()) {
            if (timestampDivisors.length > index) {
              timestampDivisors[index] += 1;
              aggregate.timestamps[index] += timestamp;
              aggregate.timestampsMax[index] = Math.max(aggregate.timestampsMax[index], timestamp);
              aggregate.timestampsMin[index] = Math.min(aggregate.timestampsMin[index], timestamp);
            } else {
              timestampDivisors.push(1);
              aggregate.timestamps.push(timestamp);
              aggregate.timestampsMax.push(timestamp);
              aggregate.timestampsMin.push(timestamp);
            }
          }
        }
      }
      if (inconsistentResults && !aggregate.error) {
        aggregate.error = new Error('Result hash inconsistency');
      }
      if (successfulExecutions > 0) {
        aggregate.duration /= successfulExecutions;
        aggregate.resultCount /= successfulExecutions;
        for (const [ index, timestampDivisor ] of timestampDivisors.entries()) {
          aggregate.timestamps[index] /= timestampDivisor;
        }
      }
      aggregates.push(aggregate);
    }
    return aggregates;
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
