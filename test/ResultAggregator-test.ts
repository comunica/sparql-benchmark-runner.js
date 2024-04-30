import type { IResult, IAggregateResult } from '../lib/Result';
import { ResultAggregator } from '../lib/ResultAggregator';

describe('ResultAggregator', () => {
  const exampleError = new Error('Example error');
  const hashError = new Error('Result hash inconsistency');
  const aggregator = new ResultAggregator();
  let results: IResult[];

  beforeEach(() => {
    results = [
      {
        name: 'a',
        id: '0',
        duration: 30,
        resultCount: 3,
        resultHash: 'a',
        timestamps: [ 10, 20, 30 ],
      },
      {
        name: 'a',
        id: '0',
        duration: 40,
        resultCount: 3,
        resultHash: 'a',
        timestamps: [ 20, 30, 40 ],
      },
      {
        name: 'a',
        id: '0',
        duration: 50,
        error: exampleError,
        resultCount: 1,
        resultHash: 'b',
        timestamps: [ 50 ],
      },
      {
        name: 'a',
        id: '0',
        duration: 50,
        resultCount: 4,
        resultHash: 'c',
        timestamps: [ 20, 30, 40, 50 ],
      },
      {
        name: 'a',
        id: '0',
        duration: 30,
        resultCount: 3,
        resultHash: 'b',
        timestamps: [ 10, 20, 30 ],
      },
    ];
  });

  it('produces the aggregate across one result', () => {
    const expected: IAggregateResult[] = [{
      name: 'a',
      id: '0',
      duration: 30,
      durationMax: 30,
      durationMin: 30,
      failures: 0,
      replication: 1,
      resultCount: 3,
      resultCountMax: 3,
      resultCountMin: 3,
      resultHash: 'a',
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
      duration: 35,
      durationMax: 40,
      durationMin: 30,
      failures: 0,
      replication: 2,
      resultCount: 3,
      resultCountMax: 3,
      resultCountMin: 3,
      resultHash: 'a',
      timestamps: [ 15, 25, 35 ],
      timestampsMax: [ 20, 30, 40 ],
      timestampsMin: [ 10, 20, 30 ],
    }];
    expect(aggregator.aggregateResults(results.slice(0, 2))).toEqual(expected);
  });

  it('produces the aggregate across multiple results with errors', () => {
    const expected: IAggregateResult[] = [{
      name: 'a',
      id: '0',
      duration: 35,
      durationMax: 40,
      durationMin: 30,
      failures: 1,
      replication: 3,
      error: exampleError,
      resultCount: 3,
      resultCountMax: 3,
      resultCountMin: 3,
      resultHash: 'a',
      timestamps: [ 15, 25, 35 ],
      timestampsMax: [ 20, 30, 40 ],
      timestampsMin: [ 10, 20, 30 ],
    }];
    expect(aggregator.aggregateResults(results.slice(0, 3))).toEqual(expected);
  });

  it('produces the aggregate across multiple results with inconsistent hashes', () => {
    const expected: IAggregateResult[] = [{
      name: 'a',
      id: '0',
      duration: 30,
      durationMax: 30,
      durationMin: 30,
      failures: 1,
      replication: 2,
      error: hashError,
      resultCount: 3,
      resultCountMax: 3,
      resultCountMin: 3,
      resultHash: 'a',
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
      duration: 40,
      durationMax: 50,
      durationMin: 30,
      failures: 1,
      replication: 3,
      error: hashError,
      resultCount: 3.3333333333333335,
      resultCountMax: 4,
      resultCountMin: 3,
      resultHash: 'a',
      timestamps: [ 16.666666666666668, 26.666666666666668, 36.666666666666664, 50 ],
      timestampsMax: [ 20, 30, 40, 50 ],
      timestampsMin: [ 10, 20, 30, 50 ],
    }];
    expect(aggregator.aggregateResults([ ...results.slice(0, 2), results[3] ])).toEqual(expected);
  });
});
