import type { IResult, IAggregateResult } from '../lib/Result';
import { ResultAggregator } from '../lib/ResultAggregator';

describe('ResultAggregator', () => {
  const exampleError = new Error('Example error');
  const hashError = new Error('Result hash inconsistency');
  const aggregator = new ResultAggregator();
  let results: IResult[];
  let noResults: IResult[];

  beforeEach(() => {
    results = [
      {
        name: 'a',
        id: '0',
        time: 30,
        results: 3,
        hash: 'a',
        timestamps: [ 10, 20, 30 ],
      },
      {
        name: 'a',
        id: '0',
        time: 40,
        results: 3,
        hash: 'a',
        timestamps: [ 20, 30, 40 ],
      },
      {
        name: 'a',
        id: '0',
        time: 50,
        error: exampleError,
        results: 1,
        hash: 'b',
        timestamps: [ 30 ],
      },
      {
        name: 'a',
        id: '0',
        time: 50,
        results: 4,
        hash: 'c',
        timestamps: [ 20, 30, 40, 50 ],
      },
      {
        name: 'a',
        id: '0',
        time: 30,
        results: 3,
        hash: 'b',
        timestamps: [ 10, 20, 30 ],
      },
    ];
    noResults = [
      {
        name: 'a',
        id: '0',
        time: 0,
        error: exampleError,
        results: 0,
        hash: 'a',
        timestamps: [ ],
      },
      {
        name: 'a',
        id: '0',
        time: 0,
        error: exampleError,
        results: 0,
        hash: 'a',
        timestamps: [ ],
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
    }];
    expect(aggregator.aggregateResults(results.slice(0, 2))).toEqual(expected);
  });

  it('produces the aggregate across multiple results with no produced results and timeout', () => {
    const expected: IAggregateResult[] = [{
      name: 'a',
      id: '0',
      error: exampleError,
      time: 0,
      timeMax: 0,
      timeMin: 0,
      failures: 2,
      replication: 2,
      results: 0,
      resultsMax: 0,
      resultsMin: 0,
      hash: '',
      timestamps: [ ],
      timestampsMax: [ ],
      timestampsMin: [ ],
    }];
    expect(aggregator.aggregateResults(noResults)).toEqual(expected);
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
      timestamps: [ 20, 25, 35 ],
      timestampsMax: [ 30, 30, 40 ],
      timestampsMin: [ 10, 20, 30 ],
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
    }];
    expect(aggregator.aggregateResults([ ...results.slice(0, 2), results[3] ])).toEqual(expected);
  });
});
