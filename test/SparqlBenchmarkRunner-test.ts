import { Readable } from 'node:stream';
import type * as RDF from '@rdfjs/types';
import type * as fetchSparqlEndpoint from 'fetch-sparql-endpoint';
import { DataFactory } from 'rdf-data-factory';
import type { IAggregateResult, IResult } from '../lib/Result';
import { SparqlBenchmarkRunner } from '../lib/SparqlBenchmarkRunner';

const streamifyArray = require('streamify-array');

const DF = new DataFactory();

const fetcher = <fetchSparqlEndpoint.SparqlEndpointFetcher> <unknown> {
  fetchBindings: () => Promise.resolve(streamifyArray([])),
};

jest.mock<typeof fetchSparqlEndpoint>('fetch-sparql-endpoint', () => (<typeof fetchSparqlEndpoint> <unknown> {
  SparqlEndpointFetcher: jest.fn().mockImplementation(() => fetcher),
}));

describe('SparqlBenchmarkRunner', () => {
  let runner: SparqlBenchmarkRunner;
  let timer: number;

  const logger: (message: string) => void = jest.fn();
  const endpoint = 'http://localhost:4000/sparql';
  const replication = 2;
  const warmup = 1;
  const querySets: Record<string, string[]> = {
    a: [ 'Q1', 'Q2' ],
    b: [ 'Q3', 'Q4' ],
  };

  // The empty result hash, that should be returned every time no results are produced
  const emptyResultHash = 'd41d8cd98f00b204e9800998ecf8427e';
  const mockedResultHash = 'a1c1cffcb47a30b77b9a1be0d6882b82';
  const mockedResult: Record<string, RDF.Term>[] = [
    { a: DF.namedNode('ex:a') },
    { b: DF.namedNode('ex:b') },
    { c: DF.namedNode('ex:c') },
  ];

  beforeAll(() => {
    jest.useFakeTimers();
  });

  beforeEach(() => {
    timer = 0;
    runner = new SparqlBenchmarkRunner({
      endpoint,
      querySets,
      replication,
      warmup,
      logger,
      // The timeout is set here to lower than default 10 seconds, or the tests will take forever
      availabilityCheckTimeout: 1_000,
    });
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(<Response>({ ok: true }));
    jest.spyOn(fetcher, 'fetchBindings').mockImplementation(async() => streamifyArray([ ...mockedResult ]));
    jest.spyOn(process, 'hrtime').mockImplementation(() => [ 0, timer++ * 1_000_000 ]);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('run', () => {
    it('runs the whole query set', async() => {
      const results = await runner.run();
      const expectedResults: IAggregateResult[] = [
        {
          name: 'a',
          id: '0',
          failures: 0,
          replication,
          resultHash: mockedResultHash,
          resultCount: 3,
          resultCountMax: 3,
          resultCountMin: 3,
          duration: 41,
          durationMax: 48,
          durationMin: 34,
          timestamps: [ 38, 39, 40 ],
          timestampsMax: [ 45, 46, 47 ],
          timestampsMin: [ 31, 32, 33 ],
        },
        {
          name: 'a',
          id: '1',
          failures: 0,
          replication,
          duration: 48,
          durationMax: 55,
          durationMin: 41,
          resultCount: 3,
          resultCountMax: 3,
          resultCountMin: 3,
          resultHash: mockedResultHash,
          timestamps: [ 45, 46, 47 ],
          timestampsMax: [ 52, 53, 54 ],
          timestampsMin: [ 38, 39, 40 ],
        },
        {
          name: 'b',
          id: '0',
          failures: 0,
          replication,
          duration: 69,
          durationMax: 76,
          durationMin: 62,
          resultCount: 3,
          resultCountMax: 3,
          resultCountMin: 3,
          resultHash: mockedResultHash,
          timestamps: [ 66, 67, 68 ],
          timestampsMax: [ 73, 74, 75 ],
          timestampsMin: [ 59, 60, 61 ],
        },
        {
          name: 'b',
          id: '1',
          failures: 0,
          replication,
          resultHash: mockedResultHash,
          resultCount: 3,
          resultCountMax: 3,
          resultCountMin: 3,
          duration: 76,
          durationMax: 83,
          durationMin: 69,
          timestamps: [ 73, 74, 75 ],
          timestampsMax: [ 80, 81, 82 ],
          timestampsMin: [ 66, 67, 68 ],
        },
      ];

      // Calls: (warmup + replication) * queryset size
      const expectedCalls = Object.values(querySets).flatMap(qs => qs).length * (replication + warmup);
      expect(fetcher.fetchBindings).toHaveBeenCalledTimes(expectedCalls);
      expect(fetch).toHaveBeenCalledTimes(expectedCalls);

      expect(results).toEqual(expectedResults);
    });

    it('waits until endpoint is up', async() => {
      // Simulate offline endpoint
      jest.spyOn(globalThis, 'fetch').mockResolvedValue(<Response>{ ok: false });

      // Start running
      const resolved = jest.fn();
      runner.run().then(resolved, () => {
        // Ignore errors
      });

      // Run a couple of check iterations
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetcher.fetchBindings).not.toHaveBeenCalled();
      await jest.runOnlyPendingTimersAsync();
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(fetcher.fetchBindings).not.toHaveBeenCalled();
      await jest.runOnlyPendingTimersAsync();
      expect(fetch).toHaveBeenCalledTimes(3);
      expect(fetcher.fetchBindings).not.toHaveBeenCalled();

      // Expect no results yet
      expect(resolved).not.toHaveBeenCalled();

      // Restore endpoint
      jest.spyOn(globalThis, 'fetch').mockResolvedValue(<Response>{ ok: true });
      await jest.runOnlyPendingTimersAsync();

      // Expect results
      const expectedCalls = Object.values(querySets).flatMap(qs => qs).length * (replication + warmup);
      expect(fetcher.fetchBindings).toHaveBeenCalledTimes(expectedCalls);
      expect(fetch).toHaveBeenCalledTimes(3 + expectedCalls);
      expect(resolved).toHaveBeenCalledTimes(1);
    });

    it('runs the whole query set and invokes listeners', async() => {
      const onStart = jest.fn();
      const onStop = jest.fn();
      await runner.run({ onStart, onStop });
      expect(onStart).toHaveBeenCalledTimes(1);
      expect(onStop).toHaveBeenCalledTimes(1);
    });
  });

  describe('executeAllQueries', () => {
    it('handles valid queries', async() => {
      const results = await runner.executeAllQueries(replication, false);
      const expectedCalls = replication * Object.values(querySets).flatMap(qs => qs).length;
      const expectedResults: IResult[] = [
        {
          duration: 6,
          id: '0',
          name: 'a',
          resultCount: 3,
          resultHash: mockedResultHash,
          timestamps: [ 3, 4, 5 ],
        },
        {
          duration: 13,
          id: '1',
          name: 'a',
          resultCount: 3,
          resultHash: mockedResultHash,
          timestamps: [ 10, 11, 12 ],
        },
        {
          duration: 20,
          id: '0',
          name: 'a',
          resultCount: 3,
          resultHash: mockedResultHash,
          timestamps: [ 17, 18, 19 ],
        },
        {
          duration: 27,
          id: '1',
          name: 'a',
          resultCount: 3,
          resultHash: mockedResultHash,
          timestamps: [ 24, 25, 26 ],
        },
        {
          duration: 34,
          id: '0',
          name: 'b',
          resultCount: 3,
          resultHash: mockedResultHash,
          timestamps: [ 31, 32, 33 ],
        },
        {
          duration: 41,
          id: '1',
          name: 'b',
          resultCount: 3,
          resultHash: mockedResultHash,
          timestamps: [ 38, 39, 40 ],
        },
        {
          duration: 48,
          id: '0',
          name: 'b',
          resultCount: 3,
          resultHash: mockedResultHash,
          timestamps: [ 45, 46, 47 ],
        },
        {
          duration: 55,
          id: '1',
          name: 'b',
          resultCount: 3,
          resultHash: mockedResultHash,
          timestamps: [ 52, 53, 54 ],
        },
      ];

      expect(fetcher.fetchBindings).toHaveBeenCalledTimes(expectedCalls);
      expect(fetch).toHaveBeenCalledTimes(expectedCalls);

      for (const query of Object.values(querySets).flatMap(qs => qs)) {
        expect(fetcher.fetchBindings).toHaveBeenCalledWith(endpoint, query);
      }

      expect(results).toEqual(expectedResults);
    });

    it('handles valid queries with metadata', async() => {
      jest.spyOn(fetcher, 'fetchBindings').mockImplementation(async() => {
        const stream = streamifyArray([ ...mockedResult ]);
        stream.on('newListener', () => {
          stream.emit('metadata', { httpRequests: timer * 2 });
        });
        return stream;
      });

      const results = await runner.executeAllQueries(replication, false);
      const expectedCalls = replication * Object.values(querySets).flatMap(qs => qs).length;
      const expectedResults: IResult[] = [
        {
          duration: 6,
          id: '0',
          name: 'a',
          resultCount: 3,
          resultHash: mockedResultHash,
          timestamps: [ 3, 4, 5 ],
          httpRequests: 6,
        },
        {
          duration: 13,
          id: '1',
          name: 'a',
          resultCount: 3,
          resultHash: mockedResultHash,
          timestamps: [ 10, 11, 12 ],
          httpRequests: 20,
        },
        {
          duration: 20,
          id: '0',
          name: 'a',
          resultCount: 3,
          resultHash: mockedResultHash,
          timestamps: [ 17, 18, 19 ],
          httpRequests: 34,
        },
        {
          duration: 27,
          id: '1',
          name: 'a',
          resultCount: 3,
          resultHash: mockedResultHash,
          timestamps: [ 24, 25, 26 ],
          httpRequests: 48,
        },
        {
          duration: 34,
          id: '0',
          name: 'b',
          resultCount: 3,
          resultHash: mockedResultHash,
          timestamps: [ 31, 32, 33 ],
          httpRequests: 62,
        },
        {
          duration: 41,
          id: '1',
          name: 'b',
          resultCount: 3,
          resultHash: mockedResultHash,
          timestamps: [ 38, 39, 40 ],
          httpRequests: 76,
        },
        {
          duration: 48,
          id: '0',
          name: 'b',
          resultCount: 3,
          resultHash: mockedResultHash,
          timestamps: [ 45, 46, 47 ],
          httpRequests: 90,
        },
        {
          duration: 55,
          id: '1',
          name: 'b',
          resultCount: 3,
          resultHash: mockedResultHash,
          timestamps: [ 52, 53, 54 ],
          httpRequests: 104,
        },
      ];

      expect(fetcher.fetchBindings).toHaveBeenCalledTimes(expectedCalls);
      expect(fetch).toHaveBeenCalledTimes(expectedCalls);

      for (const query of Object.values(querySets).flatMap(qs => qs)) {
        expect(fetcher.fetchBindings).toHaveBeenCalledWith(endpoint, query);
      }

      expect(results).toEqual(expectedResults);
    });

    it('handles valid queries when a timeout is configured', async() => {
      runner = new SparqlBenchmarkRunner({
        endpoint,
        querySets,
        replication,
        warmup,
        timeout: 10_000,
        logger,
      });

      const results = await runner.executeAllQueries(replication, false);
      const expectedCalls = replication * Object.values(querySets).flatMap(qs => qs).length;
      const expectedResults: IResult[] = [
        {
          duration: 6,
          id: '0',
          name: 'a',
          resultCount: 3,
          resultHash: mockedResultHash,
          timestamps: [ 3, 4, 5 ],
        },
        {
          duration: 13,
          id: '1',
          name: 'a',
          resultCount: 3,
          resultHash: mockedResultHash,
          timestamps: [ 10, 11, 12 ],
        },
        {
          duration: 20,
          id: '0',
          name: 'a',
          resultCount: 3,
          resultHash: mockedResultHash,
          timestamps: [ 17, 18, 19 ],
        },
        {
          duration: 27,
          id: '1',
          name: 'a',
          resultCount: 3,
          resultHash: mockedResultHash,
          timestamps: [ 24, 25, 26 ],
        },
        {
          duration: 34,
          id: '0',
          name: 'b',
          resultCount: 3,
          resultHash: mockedResultHash,
          timestamps: [ 31, 32, 33 ],
        },
        {
          duration: 41,
          id: '1',
          name: 'b',
          resultCount: 3,
          resultHash: mockedResultHash,
          timestamps: [ 38, 39, 40 ],
        },
        {
          duration: 48,
          id: '0',
          name: 'b',
          resultCount: 3,
          resultHash: mockedResultHash,
          timestamps: [ 45, 46, 47 ],
        },
        {
          duration: 55,
          id: '1',
          name: 'b',
          resultCount: 3,
          resultHash: mockedResultHash,
          timestamps: [ 52, 53, 54 ],
        },
      ];

      expect(fetcher.fetchBindings).toHaveBeenCalledTimes(expectedCalls);
      expect(fetch).toHaveBeenCalledTimes(expectedCalls);

      for (const query of Object.values(querySets).flatMap(qs => qs)) {
        expect(fetcher.fetchBindings).toHaveBeenCalledWith(endpoint, query);
      }

      expect(results).toEqual(expectedResults);
    });

    it('handles hanging queries when a timeout is configured', async() => {
      runner = new SparqlBenchmarkRunner({
        endpoint,
        querySets,
        replication,
        warmup,
        timeout: 1_000,
        logger,
      });

      jest.spyOn(fetcher, 'fetchBindings').mockImplementation(async() => {
        const readable = new Readable();
        readable._read = () => {
          // Do nothing
        };
        return readable;
      });

      jest.spyOn(runner, 'endpointAvailable').mockResolvedValue(true);

      // The availability check is mocked, so expected calls are one per query
      const expectedCalls = replication * Object.values(querySets).flatMap(qs => qs).length;
      const expectedError = new Error('Query timed out after 1 seconds client-side');
      const expectedResults: IResult[] = [
        {
          duration: 3,
          id: '0',
          name: 'a',
          resultCount: 0,
          resultHash: emptyResultHash,
          timestamps: [],
          error: expectedError,
        },
        {
          duration: 7,
          id: '1',
          name: 'a',
          resultCount: 0,
          resultHash: emptyResultHash,
          timestamps: [],
          error: expectedError,
        },
        {
          duration: 11,
          id: '0',
          name: 'a',
          resultCount: 0,
          resultHash: emptyResultHash,
          timestamps: [],
          error: expectedError,
        },
        {
          duration: 15,
          id: '1',
          name: 'a',
          resultCount: 0,
          resultHash: emptyResultHash,
          timestamps: [],
          error: expectedError,
        },
        {
          duration: 19,
          id: '0',
          name: 'b',
          resultCount: 0,
          resultHash: emptyResultHash,
          timestamps: [],
          error: expectedError,
        },
        {
          duration: 23,
          id: '1',
          name: 'b',
          resultCount: 0,
          resultHash: emptyResultHash,
          timestamps: [],
          error: expectedError,
        },
        {
          duration: 27,
          id: '0',
          name: 'b',
          resultCount: 0,
          resultHash: emptyResultHash,
          timestamps: [],
          error: expectedError,
        },
        {
          duration: 31,
          id: '1',
          name: 'b',
          resultCount: 0,
          resultHash: emptyResultHash,
          timestamps: [],
          error: expectedError,
        },
      ];

      const results = runner.executeAllQueries(replication, false);

      await jest.runAllTimersAsync();

      expect(fetcher.fetchBindings).toHaveBeenCalledTimes(expectedCalls);
      expect(fetch).not.toHaveBeenCalled();

      for (const query of Object.values(querySets).flatMap(qs => qs)) {
        expect(fetcher.fetchBindings).toHaveBeenCalledWith(endpoint, query);
      }

      await expect(results).resolves.toEqual(expectedResults);
    });

    it('handles failing queries', async() => {
      const expectedError = new Error('SparqlBenchmarkRunner test reject');

      jest.spyOn(fetcher, 'fetchBindings').mockRejectedValue(expectedError);

      jest.spyOn(runner, 'endpointAvailable').mockResolvedValue(true);

      // The availability check is mocked, so expected calls are one per query
      const expectedCalls = replication * Object.values(querySets).flatMap(qs => qs).length;
      const expectedResults: IResult[] = [
        {
          duration: 3,
          id: '0',
          name: 'a',
          resultCount: 0,
          resultHash: emptyResultHash,
          timestamps: [],
          error: expectedError,
        },
        {
          duration: 7,
          id: '1',
          name: 'a',
          resultCount: 0,
          resultHash: emptyResultHash,
          timestamps: [],
          error: expectedError,
        },
        {
          duration: 11,
          id: '0',
          name: 'a',
          resultCount: 0,
          resultHash: emptyResultHash,
          timestamps: [],
          error: expectedError,
        },
        {
          duration: 15,
          id: '1',
          name: 'a',
          resultCount: 0,
          resultHash: emptyResultHash,
          timestamps: [],
          error: expectedError,
        },
        {
          duration: 19,
          id: '0',
          name: 'b',
          resultCount: 0,
          resultHash: emptyResultHash,
          timestamps: [],
          error: expectedError,
        },
        {
          duration: 23,
          id: '1',
          name: 'b',
          resultCount: 0,
          resultHash: emptyResultHash,
          timestamps: [],
          error: expectedError,
        },
        {
          duration: 27,
          id: '0',
          name: 'b',
          resultCount: 0,
          resultHash: emptyResultHash,
          timestamps: [],
          error: expectedError,
        },
        {
          duration: 31,
          id: '1',
          name: 'b',
          resultCount: 0,
          resultHash: emptyResultHash,
          timestamps: [],
          error: expectedError,
        },
      ];

      const results = runner.executeAllQueries(replication, false);

      await jest.runAllTimersAsync();

      expect(fetcher.fetchBindings).toHaveBeenCalledTimes(expectedCalls);
      expect(fetch).not.toHaveBeenCalled();

      for (const query of Object.values(querySets).flatMap(qs => qs)) {
        expect(fetcher.fetchBindings).toHaveBeenCalledWith(endpoint, query);
      }

      await expect(results).resolves.toEqual(expectedResults);
    });

    it('handles failing bindings streams', async() => {
      const expectedError = new Error('SparqlBenchmarkRunner test stream error');

      jest.spyOn(fetcher, 'fetchBindings').mockImplementation(async() => {
        const stream = new Readable();
        stream._read = () => {
          stream.emit('error', expectedError);
        };
        return stream;
      });

      jest.spyOn(runner, 'endpointAvailable').mockResolvedValue(true);

      // The availability check is mocked, so expected calls are one per query
      const expectedCalls = replication * Object.values(querySets).flatMap(qs => qs).length * 1;
      const expectedResults: IResult[] = [
        {
          duration: 3,
          id: '0',
          name: 'a',
          resultCount: 0,
          resultHash: emptyResultHash,
          timestamps: [],
          error: expectedError,
        },
        {
          duration: 7,
          id: '1',
          name: 'a',
          resultCount: 0,
          resultHash: emptyResultHash,
          timestamps: [],
          error: expectedError,
        },
        {
          duration: 11,
          id: '0',
          name: 'a',
          resultCount: 0,
          resultHash: emptyResultHash,
          timestamps: [],
          error: expectedError,
        },
        {
          duration: 15,
          id: '1',
          name: 'a',
          resultCount: 0,
          resultHash: emptyResultHash,
          timestamps: [],
          error: expectedError,
        },
        {
          duration: 19,
          id: '0',
          name: 'b',
          resultCount: 0,
          resultHash: emptyResultHash,
          timestamps: [],
          error: expectedError,
        },
        {
          duration: 23,
          id: '1',
          name: 'b',
          resultCount: 0,
          resultHash: emptyResultHash,
          timestamps: [],
          error: expectedError,
        },
        {
          duration: 27,
          id: '0',
          name: 'b',
          resultCount: 0,
          resultHash: emptyResultHash,
          timestamps: [],
          error: expectedError,
        },
        {
          duration: 31,
          id: '1',
          name: 'b',
          resultCount: 0,
          resultHash: emptyResultHash,
          timestamps: [],
          error: expectedError,
        },
      ];

      const results = runner.executeAllQueries(replication, false);

      await jest.runAllTimersAsync();

      expect(fetcher.fetchBindings).toHaveBeenCalledTimes(expectedCalls);
      expect(fetch).not.toHaveBeenCalled();

      for (const query of Object.values(querySets).flatMap(qs => qs)) {
        expect(fetcher.fetchBindings).toHaveBeenCalledWith(endpoint, query);
      }

      await expect(results).resolves.toEqual(expectedResults);
    });

    it('logs error for throwing query and marks it as errored', async() => {
      jest.spyOn(runner, 'endpointAvailable').mockResolvedValue(true);
      const expectedError = new Error(`Dummy error in first fetchBindings call`);

      let called = false;
      jest.spyOn(fetcher, 'fetchBindings').mockImplementation(async() => {
        if (!called) {
          called = true;
          throw expectedError;
        }
        return streamifyArray([ ...mockedResult ]);
      });

      // The availability check is mocked, so expected calls are one per query
      const expectedCalls = replication * Object.values(querySets).flatMap(qs => qs).length;
      const expectedResults: IResult[] = [
        {
          duration: 3,
          id: '0',
          name: 'a',
          resultCount: 0,
          resultHash: emptyResultHash,
          timestamps: [],
          error: expectedError,
        },
        {
          duration: 10,
          id: '1',
          name: 'a',
          resultCount: 3,
          resultHash: mockedResultHash,
          timestamps: [ 7, 8, 9 ],
        },
        {
          duration: 17,
          id: '0',
          name: 'a',
          resultCount: 3,
          resultHash: mockedResultHash,
          timestamps: [ 14, 15, 16 ],
        },
        {
          duration: 24,
          id: '1',
          name: 'a',
          resultCount: 3,
          resultHash: mockedResultHash,
          timestamps: [ 21, 22, 23 ],
        },
        {
          duration: 31,
          id: '0',
          name: 'b',
          resultCount: 3,
          resultHash: mockedResultHash,
          timestamps: [ 28, 29, 30 ],
        },
        {
          duration: 38,
          id: '1',
          name: 'b',
          resultCount: 3,
          resultHash: mockedResultHash,
          timestamps: [ 35, 36, 37 ],
        },
        {
          duration: 45,
          id: '0',
          name: 'b',
          resultCount: 3,
          resultHash: mockedResultHash,
          timestamps: [ 42, 43, 44 ],
        },
        {
          duration: 52,
          id: '1',
          name: 'b',
          resultCount: 3,
          resultHash: mockedResultHash,
          timestamps: [ 49, 50, 51 ],
        },
      ];

      const results = runner.executeAllQueries(replication, false);

      await jest.runAllTimersAsync();

      expect(fetcher.fetchBindings).toHaveBeenCalledTimes(expectedCalls);
      expect(fetch).not.toHaveBeenCalled();

      for (const query of Object.values(querySets).flatMap(qs => qs)) {
        expect(fetcher.fetchBindings).toHaveBeenCalledWith(endpoint, query);
      }

      await expect(results).resolves.toEqual(expectedResults);

      expect(logger).toHaveBeenNthCalledWith(1, 'Executing 2 query sets, containing 4 queries, with replication of 2');
      expect(logger).toHaveBeenNthCalledWith(2, 'Execute: 1 / 8 <a#0>');
      expect(logger).toHaveBeenNthCalledWith(3, 'Endpoint available after 0 seconds');
      expect(logger).toHaveBeenNthCalledWith(4, `${expectedError.name}: ${expectedError.message}`);
    });

    it('logs error for throwing query in stream and marks it as errored', async() => {
      jest.spyOn(runner, 'endpointAvailable').mockResolvedValue(true);
      const expectedError = new Error(`Dummy error in first fetchBindings call`);

      let called = false;
      jest.spyOn(fetcher, 'fetchBindings').mockImplementation(async() => {
        if (!called) {
          called = true;
          const readable = new Readable();
          readable._read = () => {
            readable.emit('data', 'a');
            readable.emit('data', 'b');
            readable.emit('error', expectedError);
          };
          return readable;
        }
        return streamifyArray([ ...mockedResult ]);
      });

      // The availability check is mocked, so expected calls are one per query
      const expectedCalls = replication * Object.values(querySets).flatMap(qs => qs).length * 1;
      const expectedResults: IResult[] = [
        {
          duration: 5,
          id: '0',
          name: 'a',
          resultCount: 2,
          resultHash: 'c53f4ebe9b2a50bc2b52fd88a5d503e1',
          timestamps: [ 3, 4 ],
          error: expectedError,
        },
        {
          duration: 12,
          id: '1',
          name: 'a',
          resultCount: 3,
          resultHash: mockedResultHash,
          timestamps: [ 9, 10, 11 ],
        },
        {
          duration: 19,
          id: '0',
          name: 'a',
          resultCount: 3,
          resultHash: mockedResultHash,
          timestamps: [ 16, 17, 18 ],
        },
        {
          duration: 26,
          id: '1',
          name: 'a',
          resultCount: 3,
          resultHash: mockedResultHash,
          timestamps: [ 23, 24, 25 ],
        },
        {
          duration: 33,
          id: '0',
          name: 'b',
          resultCount: 3,
          resultHash: mockedResultHash,
          timestamps: [ 30, 31, 32 ],
        },
        {
          duration: 40,
          id: '1',
          name: 'b',
          resultCount: 3,
          resultHash: mockedResultHash,
          timestamps: [ 37, 38, 39 ],
        },
        {
          duration: 47,
          id: '0',
          name: 'b',
          resultCount: 3,
          resultHash: mockedResultHash,
          timestamps: [ 44, 45, 46 ],
        },
        {
          duration: 54,
          id: '1',
          name: 'b',
          resultCount: 3,
          resultHash: mockedResultHash,
          timestamps: [ 51, 52, 53 ],
        },
      ];

      const results = runner.executeAllQueries(replication, false);

      await jest.runAllTimersAsync();

      expect(fetcher.fetchBindings).toHaveBeenCalledTimes(expectedCalls);
      expect(fetch).not.toHaveBeenCalled();

      for (const query of Object.values(querySets).flatMap(qs => qs)) {
        expect(fetcher.fetchBindings).toHaveBeenCalledWith(endpoint, query);
      }

      await expect(results).resolves.toEqual(expectedResults);

      await expect(results).resolves.toEqual(expectedResults);

      expect(logger).toHaveBeenNthCalledWith(1, 'Executing 2 query sets, containing 4 queries, with replication of 2');
      expect(logger).toHaveBeenNthCalledWith(2, 'Execute: 1 / 8 <a#0>');
      expect(logger).toHaveBeenNthCalledWith(3, 'Endpoint available after 0 seconds');
      expect(logger).toHaveBeenNthCalledWith(4, `${expectedError.name}: ${expectedError.message}`);
    });
  });

  describe('executeQuery', () => {
    it('handles a valid query', async() => {
      const expectedResult: IResult = {
        name: 'a',
        id: '0',
        duration: 4,
        resultCount: 3,
        timestamps: [ 1, 2, 3 ],
        resultHash: mockedResultHash,
      };

      const result = runner.executeQuery('a', '0', 'Q');
      await expect(result).resolves.toEqual(expectedResult);
    });

    it('handles a valid query with metadata', async() => {
      jest.spyOn(fetcher, 'fetchBindings').mockImplementation(async() => {
        const stream = streamifyArray([ ...mockedResult ]);
        stream.on('newListener', () => {
          stream.emit('metadata', { httpRequests: 10 });
        });
        return stream;
      });

      const expectedResult: IResult = {
        name: 'a',
        id: '0',
        resultCount: 3,
        resultHash: mockedResultHash,
        duration: 4,
        timestamps: [ 1, 2, 3 ],
        httpRequests: 10,
      };

      const result = runner.executeQuery('a', '0', 'Q');

      await expect(result).resolves.toEqual(expectedResult);
    });

    it('handles a valid query when a timeout is configured', async() => {
      runner = new SparqlBenchmarkRunner({
        endpoint,
        querySets,
        replication,
        warmup,
        timeout: 10_000,
        logger,
      });

      const expectedResult: IResult = {
        name: 'a',
        id: '0',
        resultCount: 3,
        resultHash: mockedResultHash,
        duration: 4,
        timestamps: [ 1, 2, 3 ],
      };

      const result = runner.executeQuery('a', '0', 'Q');

      await expect(result).resolves.toEqual(expectedResult);
    });

    it('handles a hanging query when a timeout is configured', async() => {
      runner = new SparqlBenchmarkRunner({
        endpoint,
        querySets,
        replication,
        warmup,
        timeout: 1_000,
        logger,
      });

      const expectedResult: IResult = {
        name: 'a',
        id: '0',
        resultCount: 0,
        resultHash: emptyResultHash,
        timestamps: [],
        error: new Error('Query timed out after 1 seconds client-side'),
        duration: 1,
      };

      jest.spyOn(fetcher, 'fetchBindings').mockImplementation(async() => {
        const readable = new Readable();
        readable._read = () => {
          // Do nothing
        };
        return readable;
      });

      const result = runner.executeQuery('a', '0', 'Q');

      await jest.runAllTimersAsync();

      await expect(result).resolves.toEqual(expectedResult);
    });

    it('handles a failing query', async() => {
      const expectedError = new Error('SparqlBenchmarkRunner test reject');

      jest.spyOn(fetcher, 'fetchBindings').mockRejectedValue(expectedError);

      const expectedResult: IResult = {
        name: 'a',
        id: '0',
        duration: 1,
        resultCount: 0,
        resultHash: emptyResultHash,
        timestamps: [],
        error: expectedError,
      };

      const result = runner.executeQuery('a', '0', 'Q');

      await expect(result).resolves.toEqual(expectedResult);
    });

    it('handles a failing bindings stream', async() => {
      const expectedError = new Error('SparqlBenchmarkRunner test stream error');

      jest.spyOn(fetcher, 'fetchBindings').mockImplementation(async() => {
        const stream = new Readable();
        stream._read = () => {
          stream.emit('error', expectedError);
        };
        return stream;
      });

      const expectedResult: IResult = {
        name: 'a',
        id: '0',
        duration: 1,
        resultCount: 0,
        resultHash: emptyResultHash,
        timestamps: [],
        error: expectedError,
      };

      const result = runner.executeQuery('a', '0', 'Q');

      await expect(result).resolves.toEqual(expectedResult);
    });
  });

  describe('countTime', () => {
    it('returns duration in milliseconds', async() => {
      process.hrtime = <any> (() => [ 1, 1_000_000 ]);
      expect(runner.countTime([ 10, 10 ])).toBe(1_001);
    });
  });

  describe('endpointAvailable', () => {
    it('returns true for a valid endpoint', async() => {
      await expect(runner.endpointAvailable()).resolves.toBeTruthy();
    });

    it('returns false for an invalid endpoint', async() => {
      jest.spyOn(globalThis, 'fetch').mockResolvedValue(<Response>{ ok: false });
      await expect(runner.endpointAvailable()).resolves.toBeFalsy();
    });

    it('returns false for a hanging request', async() => {
      jest.spyOn(globalThis, 'fetch').mockImplementation(() => new Promise<Response>(() => {
        // Do nothing
      }));
      const available = runner.endpointAvailable();
      await jest.runAllTimersAsync();
      await expect(available).resolves.toBeFalsy();
    });

    it('returns false for an erroring request', async() => {
      jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Endpoint fetch failed'));
      const available = runner.endpointAvailable();
      await expect(available).resolves.toBeFalsy();
    });
  });

  describe('bindingsToString', () => {
    const bindings: Record<string, RDF.Term> = {
      a: DF.namedNode('ex:a'),
      b: DF.namedNode('ex:b'),
    };
    const bindingsString = '{"a":"ex:a","b":"ex:b"}';

    it('serializes bindings', async() => {
      expect(runner.bindingsToString(bindings)).toBe(bindingsString);
    });

    it('serializes bindings regardless of their order', async() => {
      const reversedBindings: Record<string, RDF.Term> = Object.fromEntries(Object.entries(bindings).reverse());
      expect(runner.bindingsToString(reversedBindings)).toBe(bindingsString);
    });
  });

  describe('sleep', () => {
    it('sleeps for a while', async() => {
      const resolved = jest.fn();
      runner.sleep(100).then(resolved, () => {
        // Do nothing
      });
      expect(resolved).not.toHaveBeenCalled();
      await jest.runAllTimersAsync();
      expect(resolved).toHaveBeenCalledTimes(1);
    });
  });

  describe('log', () => {
    it('invokes the logger', () => {
      runner.log('some message');
      expect(logger).toHaveBeenCalledWith('some message');
    });

    it('does not invoke an undefined logger', () => {
      runner = new SparqlBenchmarkRunner({
        endpoint,
        querySets,
        replication,
        warmup,
        logger: undefined,
      });
      runner.log('some message');
      expect(logger).not.toHaveBeenCalled();
    });
  });
});
