import type { IResult, IAggregateResult } from '../lib/Result';
import { ResultAggregatorComunica } from '../lib/ResultAggregatorComunica';

describe('ResultAggregatorComunica', () => {
  const exampleError = new Error('Example error');
  const hashError = new Error('Result hash inconsistency');
  const aggregator = new ResultAggregatorComunica();
  let results: IResult[];

  beforeEach(() => {
    results = [
      {
        name: 'a',
        id: '0',
        time: 30,
        results: 3,
        hash: 'a',
        timestamps: [ 10, 20, 30 ],
        httpRequests: 10,
      },
      {
        name: 'a',
        id: '0',
        time: 40,
        results: 3,
        hash: 'a',
        timestamps: [ 20, 30, 40 ],
        httpRequests: 20,
      },
      {
        name: 'a',
        id: '0',
        time: 50,
        error: exampleError,
        results: 1,
        hash: 'b',
        timestamps: [ 50 ],
        httpRequests: 6,
      },
      {
        name: 'a',
        id: '0',
        time: 50,
        results: 4,
        hash: 'c',
        timestamps: [ 20, 30, 40, 50 ],
        httpRequests: 40,
      },
      {
        name: 'a',
        id: '0',
        time: 30,
        results: 3,
        hash: 'b',
        timestamps: [ 10, 20, 30 ],
        httpRequests: 10,
      },
    ];
  });

  it('produces the aggregate across one result', () => {
    const expected: IAggregateResult[] = [{
      name: 'a',
      id: '0',
      time: 30,
      timeMax: 30,
      timeMin: 30,
      failures: 0,
      replication: 1,
      results: 3,
      resultsMax: 3,
      resultsMin: 3,
      hash: 'a',
      timestamps: [ 10, 20, 30 ],
      timestampsMax: [ 10, 20, 30 ],
      timestampsMin: [ 10, 20, 30 ],
      httpRequests: 10,
      httpRequestsMax: 10,
      httpRequestsMin: 10,
    }];
    expect(aggregator.aggregateResults([ results[0] ])).toEqual(expected);
  });

  it('produces the aggregate across multiple results', () => {
    const expected: IAggregateResult[] = [{
      name: 'a',
      id: '0',
      time: 35,
      timeMax: 40,
      timeMin: 30,
      failures: 0,
      replication: 2,
      results: 3,
      resultsMax: 3,
      resultsMin: 3,
      hash: 'a',
      timestamps: [ 15, 25, 35 ],
      timestampsMax: [ 20, 30, 40 ],
      timestampsMin: [ 10, 20, 30 ],
      httpRequests: 15,
      httpRequestsMax: 20,
      httpRequestsMin: 10,
    }];
    expect(aggregator.aggregateResults(results.slice(0, 2))).toEqual(expected);
  });

  it('produces the aggregate across multiple results with errors', () => {
    const expected: IAggregateResult[] = [{
      name: 'a',
      id: '0',
      time: 35,
      timeMax: 40,
      timeMin: 30,
      failures: 1,
      replication: 3,
      error: exampleError,
      results: 3,
      resultsMax: 3,
      resultsMin: 3,
      hash: 'a',
      timestamps: [ 15, 25, 35 ],
      timestampsMax: [ 20, 30, 40 ],
      timestampsMin: [ 10, 20, 30 ],
      httpRequests: 15,
      httpRequestsMax: 20,
      httpRequestsMin: 10,
    }];
    expect(aggregator.aggregateResults(results.slice(0, 3))).toEqual(expected);
  });

  it('produces the aggregate across multiple results with inconsistent hashes', () => {
    const expected: IAggregateResult[] = [{
      name: 'a',
      id: '0',
      time: 30,
      timeMax: 30,
      timeMin: 30,
      failures: 1,
      replication: 2,
      error: hashError,
      results: 3,
      resultsMax: 3,
      resultsMin: 3,
      hash: 'a',
      timestamps: [ 10, 20, 30 ],
      timestampsMax: [ 10, 20, 30 ],
      timestampsMin: [ 10, 20, 30 ],
      httpRequests: 10,
      httpRequestsMax: 10,
      httpRequestsMin: 10,
    }];
    expect(aggregator.aggregateResults([ results[0], results[4] ])).toEqual(expected);
  });

  it('produces the aggregate across multiple results with different result counts', () => {
    const expected: IAggregateResult[] = [{
      name: 'a',
      id: '0',
      time: 40,
      timeMax: 50,
      timeMin: 30,
      failures: 1,
      replication: 3,
      error: hashError,
      results: 3.3333333333333335,
      resultsMax: 4,
      resultsMin: 3,
      hash: 'a',
      timestamps: [ 16.666666666666668, 26.666666666666668, 36.666666666666664, 50 ],
      timestampsMax: [ 20, 30, 40, 50 ],
      timestampsMin: [ 10, 20, 30, 50 ],
      httpRequests: 23.333333333333332,
      httpRequestsMax: 40,
      httpRequestsMin: 10,
    }];
    expect(aggregator.aggregateResults([ ...results.slice(0, 2), results[3] ])).toEqual(expected);
  });
});
