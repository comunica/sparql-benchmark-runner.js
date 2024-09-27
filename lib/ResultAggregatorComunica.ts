import type { IResult, IAggregateResult } from './Result';
import { ResultAggregator } from './ResultAggregator';

/**
 * Query result aggregator that handles Comunica-specific metadata.
 */
export class ResultAggregatorComunica extends ResultAggregator {
  /**
   * Produce aggregated query results from a set of single execution results.
   * @param results Individual query execution results.
   * @returns Aggregated results per individual query.
   */
  public aggregateResults(results: IResult[]): IAggregateResult[] {
    const groupedResults = this.groupResults(results);
    const aggregateResults = this.aggregateGroupedResults(groupedResults);
    const groupedAggregates = this.groupResults(aggregateResults);
    for (const [ key, resultGroup ] of Object.entries(groupedResults)) {
      let requestsSum = 0;
      let requestsMax = 0;
      let requestsMin = 0;
      let successfulExecutions = 0;
      for (const result of resultGroup.filter(res => !res.error && typeof res.httpRequests === 'number')) {
        const resultHttpRequests = <number>result.httpRequests;
        requestsSum = successfulExecutions > 0 ? requestsSum + resultHttpRequests : resultHttpRequests;
        requestsMax = successfulExecutions > 0 ? Math.max(requestsMax, resultHttpRequests) : resultHttpRequests;
        requestsMin = successfulExecutions > 0 ? Math.min(requestsMin, resultHttpRequests) : resultHttpRequests;
        successfulExecutions++;
      }
      if (successfulExecutions > 0) {
        groupedAggregates[key][0].httpRequests = requestsSum / successfulExecutions;
        groupedAggregates[key][0].httpRequestsMax = requestsMax;
        groupedAggregates[key][0].httpRequestsMin = requestsMin;
        groupedAggregates[key][0].httpRequestsStd = 0;

        for (const { httpRequests, error } of resultGroup) {
          if (!error) {
            groupedAggregates[key][0].httpRequestsStd += (httpRequests - groupedAggregates[key][0].httpRequests) ** 2;
          }
        }
        groupedAggregates[key][0].httpRequestsStd =
         Math.sqrt(groupedAggregates[key][0].httpRequestsStd / successfulExecutions);
      }
    }
    return aggregateResults;
  }
}
