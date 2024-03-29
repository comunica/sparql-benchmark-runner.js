import { Readable } from 'stream';
import { SparqlBenchmarkRunner } from '../lib/SparqlBenchmarkRunner';
const streamifyArray = require('streamify-array');

const fetcher: any = {};
jest.mock('fetch-sparql-endpoint', () => ({
  SparqlEndpointFetcher: jest.fn().mockImplementation(() => fetcher),
}));

jest.useFakeTimers();

describe('SparqlBenchmarkRunner', () => {
  let runner: SparqlBenchmarkRunner;
  let querySets: Record<string, string[]>;
  let logger: (message: string) => void;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();

    querySets = {
      a: [ 'Q1', 'Q2' ],
      b: [ 'Q3', 'Q4' ],
    };
    logger = jest.fn();
    runner = new SparqlBenchmarkRunner({
      endpoint: 'http://example.org/sparql',
      querySets,
      replication: 3,
      warmup: 2,
      timestampsRecording: false,
      logger,
    });
    fetcher.fetchBindings = jest.fn(async() => streamifyArray([ 'a', 'b', 'c' ]));
    let timer = 0;
    process.hrtime = <any> (() => [ 0, timer++ * 1_000_000 ]);
  });

  describe('run', () => {
    it('runs the whole query set', async() => {
      const results = await runner.run();

      // Alive check + (warmup + replication) * queryset-size
      expect(fetcher.fetchBindings).toHaveBeenCalledTimes(1 + (3 + 2) * 4);

      expect(results).toEqual({
        a0: {
          count: 3,
          error: false,
          id: '0',
          name: 'a',
          time: 25,
          timestamps: [],
          metadata: {},
        },
        a1: {
          count: 3,
          error: false,
          id: '1',
          name: 'a',
          time: 27,
          timestamps: [],
          metadata: {},
        },
        b0: {
          count: 3,
          error: false,
          id: '0',
          name: 'b',
          time: 29,
          timestamps: [],
          metadata: {},
        },
        b1: {
          count: 3,
          error: false,
          id: '1',
          name: 'b',
          time: 31,
          timestamps: [],
          metadata: {},
        },
      });
    });

    it('runs the whole query set with timestamps', async() => {
      runner = new SparqlBenchmarkRunner({
        endpoint: 'http://example.org/sparql',
        querySets,
        replication: 3,
        warmup: 2,
        timestampsRecording: true,
        logger,
      });

      const results = await runner.run();

      // Alive check + (warmup + replication) * queryset-size
      expect(fetcher.fetchBindings).toHaveBeenCalledTimes(1 + (3 + 2) * 4);

      expect(results).toEqual({
        a0: {
          count: 3,
          error: false,
          id: '0',
          name: 'a',
          time: 64,
          timestamps: [
            61,
            62,
            63,
          ],
          metadata: {},
        },
        a1: {
          count: 3,
          error: false,
          id: '1',
          name: 'a',
          time: 69,
          timestamps: [
            66,
            67,
            68,
          ],
          metadata: {},
        },
        b0: {
          count: 3,
          error: false,
          id: '0',
          name: 'b',
          time: 74,
          timestamps: [
            71,
            72,
            73,
          ],
          metadata: {},
        },
        b1: {
          count: 3,
          error: false,
          id: '1',
          name: 'b',
          time: 79,
          timestamps: [
            76,
            77,
            78,
          ],
          metadata: {},
        },
      });
    });

    it('waits until endpoint is up', async() => {
      // Simulate offline endpoint
      fetcher.fetchBindings = jest.fn(() => Promise.reject(new Error('SparqlBenchmarkRunner test reject')));

      // Start running
      const resolved = jest.fn();
      runner.run()
        .then(resolved, () => {
          // Ignore errors
        });

      // Run a couple of check iterations
      expect(fetcher.fetchBindings).toHaveBeenCalledTimes(1);
      await new Promise(setImmediate);
      jest.runAllTimers();
      await new Promise(setImmediate);
      expect(fetcher.fetchBindings).toHaveBeenCalledTimes(2);
      await new Promise(setImmediate);
      jest.runAllTimers();
      await new Promise(setImmediate);
      expect(fetcher.fetchBindings).toHaveBeenCalledTimes(3);

      // Expect no results yet
      expect(resolved).not.toHaveBeenCalled();

      // Restore endpoint
      fetcher.fetchBindings = jest.fn(async() => streamifyArray([ 'a', 'b', 'c' ]));
      await new Promise(setImmediate);
      jest.runAllTimers();
      await new Promise(setImmediate);

      // Expect results
      expect(resolved).toHaveBeenCalled();
    });

    it('runs the whole query set and invokes listeners', async() => {
      const onStart = jest.fn();
      const onStop = jest.fn();
      await runner.run({ onStart, onStop });
      expect(onStart).toHaveBeenCalledTimes(1);
      expect(onStop).toHaveBeenCalledTimes(1);
    });
  });

  describe('executeQueries', () => {
    it('handles valid queries for one round', async() => {
      const results = {};
      await runner.executeQueries(results, 1);

      expect(fetcher.fetchBindings).toHaveBeenCalledTimes(4);
      expect(fetcher.fetchBindings).toHaveBeenCalledWith('http://example.org/sparql', 'Q1');
      expect(fetcher.fetchBindings).toHaveBeenCalledWith('http://example.org/sparql', 'Q2');
      expect(fetcher.fetchBindings).toHaveBeenCalledWith('http://example.org/sparql', 'Q3');
      expect(fetcher.fetchBindings).toHaveBeenCalledWith('http://example.org/sparql', 'Q4');
      expect(results).toEqual({
        a0: { count: 3, error: false, id: '0', name: 'a', time: 1, timestamps: [], metadata: {}},
        a1: { count: 3, error: false, id: '1', name: 'a', time: 3, timestamps: [], metadata: {}},
        b0: { count: 3, error: false, id: '0', name: 'b', time: 5, timestamps: [], metadata: {}},
        b1: { count: 3, error: false, id: '1', name: 'b', time: 7, timestamps: [], metadata: {}},
      });
    });

    it('handles valid queries for one round with timestamps', async() => {
      runner = new SparqlBenchmarkRunner({
        endpoint: 'http://example.org/sparql',
        querySets,
        replication: 3,
        warmup: 2,
        timestampsRecording: true,
        logger,
      });

      const results = {};
      await runner.executeQueries(results, 1);

      expect(fetcher.fetchBindings).toHaveBeenCalledTimes(4);
      expect(fetcher.fetchBindings).toHaveBeenCalledWith('http://example.org/sparql', 'Q1');
      expect(fetcher.fetchBindings).toHaveBeenCalledWith('http://example.org/sparql', 'Q2');
      expect(fetcher.fetchBindings).toHaveBeenCalledWith('http://example.org/sparql', 'Q3');
      expect(fetcher.fetchBindings).toHaveBeenCalledWith('http://example.org/sparql', 'Q4');
      expect(results).toEqual({
        a0: { count: 3, error: false, id: '0', name: 'a', time: 4, timestamps: [ 1, 2, 3 ], metadata: {}},
        a1: { count: 3, error: false, id: '1', name: 'a', time: 9, timestamps: [ 6, 7, 8 ], metadata: {}},
        b0: { count: 3, error: false, id: '0', name: 'b', time: 14, timestamps: [ 11, 12, 13 ], metadata: {}},
        b1: { count: 3, error: false, id: '1', name: 'b', time: 19, timestamps: [ 16, 17, 18 ], metadata: {}},
      });
    });

    it('handles valid queries for multiple rounds', async() => {
      const results = {};
      await runner.executeQueries(results, 3);

      expect(fetcher.fetchBindings).toHaveBeenCalledTimes(12);
      expect(fetcher.fetchBindings).toHaveBeenCalledWith('http://example.org/sparql', 'Q1');
      expect(fetcher.fetchBindings).toHaveBeenCalledWith('http://example.org/sparql', 'Q2');
      expect(fetcher.fetchBindings).toHaveBeenCalledWith('http://example.org/sparql', 'Q3');
      expect(fetcher.fetchBindings).toHaveBeenCalledWith('http://example.org/sparql', 'Q4');
      expect(results).toEqual({
        a0: { count: 3, error: false, id: '0', name: 'a', time: 27, timestamps: [], metadata: {}},
        a1: { count: 3, error: false, id: '1', name: 'a', time: 33, timestamps: [], metadata: {}},
        b0: { count: 3, error: false, id: '0', name: 'b', time: 39, timestamps: [], metadata: {}},
        b1: { count: 3, error: false, id: '1', name: 'b', time: 45, timestamps: [], metadata: {}},
      });
    });

    it('handles valid queries for multiple rounds with metadata', async() => {
      fetcher.fetchBindings = jest.fn(async() => {
        const stream = streamifyArray([ 'a', 'b', 'c' ]);
        stream.on('newListener', () => {
          stream.emit('metadata', { httpRequests: 10 });
        });
        return stream;
      });

      const results = {};
      await runner.executeQueries(results, 3);

      expect(fetcher.fetchBindings).toHaveBeenCalledTimes(12);
      expect(fetcher.fetchBindings).toHaveBeenCalledWith('http://example.org/sparql', 'Q1');
      expect(fetcher.fetchBindings).toHaveBeenCalledWith('http://example.org/sparql', 'Q2');
      expect(fetcher.fetchBindings).toHaveBeenCalledWith('http://example.org/sparql', 'Q3');
      expect(fetcher.fetchBindings).toHaveBeenCalledWith('http://example.org/sparql', 'Q4');
      expect(results).toEqual({
        a0: { count: 3, error: false, id: '0', name: 'a', time: 27, timestamps: [], metadata: { httpRequests: 10 }},
        a1: { count: 3, error: false, id: '1', name: 'a', time: 33, timestamps: [], metadata: { httpRequests: 10 }},
        b0: { count: 3, error: false, id: '0', name: 'b', time: 39, timestamps: [], metadata: { httpRequests: 10 }},
        b1: { count: 3, error: false, id: '1', name: 'b', time: 45, timestamps: [], metadata: { httpRequests: 10 }},
      });
    });

    it('logs error for throwing query and mark it as errored', async() => {
      (<any> runner).sleep = jest.fn(() => Promise.resolve(true));

      let called = false;
      fetcher.fetchBindings = jest.fn(async() => {
        if (!called) {
          called = true;
          throw new Error(`Dummy error in first fetchBindings call`);
        }
        return streamifyArray([ 'a', 'b', 'c' ]);
      });

      const results = {};
      await runner.executeQueries(results, 1);

      expect(fetcher.fetchBindings).toHaveBeenCalledTimes(5);
      expect(fetcher.fetchBindings).toHaveBeenCalledWith('http://example.org/sparql', 'Q1');
      expect(fetcher.fetchBindings).toHaveBeenCalledWith('http://example.org/sparql', 'Q2');
      expect(fetcher.fetchBindings).toHaveBeenCalledWith('http://example.org/sparql', 'Q3');
      expect(fetcher.fetchBindings).toHaveBeenCalledWith('http://example.org/sparql', 'Q4');
      expect(results).toEqual({
        a0: { count: 0, error: true, id: '0', name: 'a', time: 0, timestamps: [], metadata: {}},
        a1: { count: 3, error: false, id: '1', name: 'a', time: 1, timestamps: [], metadata: {}},
        b0: { count: 3, error: false, id: '0', name: 'b', time: 3, timestamps: [], metadata: {}},
        b1: { count: 3, error: false, id: '1', name: 'b', time: 5, timestamps: [], metadata: {}},
      });

      expect(logger).toHaveBeenCalledWith(`\rError occurred at query a:0 for iteration 1/1: Dummy error in first fetchBindings call\n`);
      expect(setTimeout).toHaveBeenCalled();
    });

    it('logs error for throwing query in stream and mark it as errored', async() => {
      (<any> runner).sleep = jest.fn(() => Promise.resolve(true));

      let called = false;
      fetcher.fetchBindings = jest.fn(async() => {
        if (!called) {
          called = true;
          const readable = new Readable();
          readable._read = () => {
            readable.emit('data', 'a');
            readable.emit('data', 'b');
            readable.emit('error', new Error(`Dummy error in first fetchBindings call`));
          };
          return readable;
        }
        return streamifyArray([ 'a', 'b', 'c' ]);
      });

      const results = {};
      await runner.executeQueries(results, 1);

      expect(fetcher.fetchBindings).toHaveBeenCalledTimes(5);
      expect(fetcher.fetchBindings).toHaveBeenCalledWith('http://example.org/sparql', 'Q1');
      expect(fetcher.fetchBindings).toHaveBeenCalledWith('http://example.org/sparql', 'Q2');
      expect(fetcher.fetchBindings).toHaveBeenCalledWith('http://example.org/sparql', 'Q3');
      expect(fetcher.fetchBindings).toHaveBeenCalledWith('http://example.org/sparql', 'Q4');
      expect(results).toEqual({
        a0: { count: 2, error: true, id: '0', name: 'a', time: 1, timestamps: [], metadata: {}},
        a1: { count: 3, error: false, id: '1', name: 'a', time: 3, timestamps: [], metadata: {}},
        b0: { count: 3, error: false, id: '0', name: 'b', time: 5, timestamps: [], metadata: {}},
        b1: { count: 3, error: false, id: '1', name: 'b', time: 7, timestamps: [], metadata: {}},
      });

      expect(logger).toHaveBeenCalledWith(`\rError occurred at query a:0 for iteration 1/1: Dummy error in first fetchBindings call\n`);
      expect(setTimeout).toHaveBeenCalled();
    });

    it('logs error for throwing query in multiple iterations and mark it as errored', async() => {
      (<any> runner).sleep = jest.fn(() => Promise.resolve(true));

      fetcher.fetchBindings = jest.fn(async(endpoint: string, query: string) => {
        if (query === querySets.a[0]) {
          throw new Error(`Dummy error in first fetchBindings call`);
        }
        return streamifyArray([ 'a', 'b', 'c' ]);
      });

      const results = {};
      await runner.executeQueries(results, 2);

      expect(fetcher.fetchBindings).toHaveBeenCalledTimes(10);
      expect(fetcher.fetchBindings).toHaveBeenCalledWith('http://example.org/sparql', 'Q1');
      expect(fetcher.fetchBindings).toHaveBeenCalledWith('http://example.org/sparql', 'Q2');
      expect(fetcher.fetchBindings).toHaveBeenCalledWith('http://example.org/sparql', 'Q3');
      expect(fetcher.fetchBindings).toHaveBeenCalledWith('http://example.org/sparql', 'Q4');
      expect(results).toEqual({
        a0: { count: 0, error: true, id: '0', name: 'a', time: 0, timestamps: [], metadata: {}},
        a1: { count: 3, error: false, id: '1', name: 'a', time: 8, timestamps: [], metadata: {}},
        b0: { count: 3, error: false, id: '0', name: 'b', time: 12, timestamps: [], metadata: {}},
        b1: { count: 3, error: false, id: '1', name: 'b', time: 16, timestamps: [], metadata: {}},
      });

      expect(logger).toHaveBeenCalledWith(`\rError occurred at query a:0 for iteration 1/2: Dummy error in first fetchBindings call\n`);
      expect(setTimeout).toHaveBeenCalled();
    });
  });

  describe('executeQuery', () => {
    it('throws for a failing query', async() => {
      fetcher.fetchBindings = jest.fn(() => Promise.reject(new Error('SparqlBenchmarkRunner test reject')));
      await expect(runner.executeQuery('Q')).rejects.toThrow('SparqlBenchmarkRunner test reject');
    });

    it('throws for an erroring stream', async() => {
      fetcher.fetchBindings = jest.fn(async() => {
        const stream = new Readable();
        stream._read = () => {
          stream.emit('error', new Error('SparqlBenchmarkRunner test stream error'));
        };
        return stream;
      });
      await expect(runner.executeQuery('Q')).rejects.toThrow('SparqlBenchmarkRunner test stream error');
    });

    it('handles a valid query', async() => {
      expect(await runner.executeQuery('Q')).toEqual({
        count: 3,
        time: 1,
        timestamps: [],
        metadata: {},
      });
    });

    it('handles a valid query when recording timestamps', async() => {
      runner = new SparqlBenchmarkRunner({
        endpoint: 'http://example.org/sparql',
        querySets,
        replication: 3,
        warmup: 2,
        timestampsRecording: true,
        logger,
      });
      expect(await runner.executeQuery('Q')).toEqual({
        count: 3,
        time: 4,
        timestamps: [ 1, 2, 3 ],
        metadata: {},
      });
    });

    it('handles a valid query that produces metadata', async() => {
      fetcher.fetchBindings = jest.fn(async() => {
        const stream = streamifyArray([ 'a', 'b', 'c' ]);
        stream.on('newListener', () => {
          stream.emit('metadata', { httpRequests: 10 });
        });
        return stream;
      });

      expect(await runner.executeQuery('Q')).toEqual({
        count: 3,
        time: 1,
        timestamps: [],
        metadata: { httpRequests: 10 },
      });
    });

    it('handles a valid query when a timeout was configured', async() => {
      runner = new SparqlBenchmarkRunner({
        endpoint: 'http://example.org/sparql',
        querySets,
        replication: 3,
        warmup: 2,
        timestampsRecording: false,
        timeout: 10_000,
        logger,
      });

      expect(await runner.executeQuery('Q')).toEqual({
        count: 3,
        time: 1,
        metadata: {},
        timestamps: [],
      });
    });

    it('throws on a hanging query when a timeout was configured', async() => {
      runner = new SparqlBenchmarkRunner({
        endpoint: 'http://example.org/sparql',
        querySets,
        replication: 3,
        warmup: 2,
        timestampsRecording: false,
        timeout: 10_000,
        logger,
      });

      fetcher.fetchBindings = jest.fn(async() => {
        const readable = new Readable();
        readable._read = () => {
          // Do nothing
        };
        return readable;
      });

      setImmediate(() => {
        jest.runAllTimers();
      });

      await expect(runner.executeQuery('Q')).rejects.toThrow('Timeout for running query');
    });
  });

  describe('countTime', () => {
    it('returns duration in milliseconds', async() => {
      process.hrtime = <any> (() => [ 1, 1_000_000 ]);
      expect(runner.countTime([ 10, 10 ])).toEqual(1_001);
    });
  });

  describe('isUp', () => {
    it('returns true for a valid endpoint', async() => {
      expect(await runner.isUp()).toBeTruthy();
    });

    it('returns false for an erroring stream', async() => {
      fetcher.fetchBindings = jest.fn(async() => {
        const stream = new Readable();
        stream._read = () => {
          stream.emit('error', new Error('SparqlBenchmarkRunner test stream error'));
        };
        return stream;
      });
      expect(await runner.isUp()).toBeFalsy();
    });

    it('returns false for a rejecting fetchBindings promise', async() => {
      fetcher.fetchBindings = jest.fn(() => Promise.reject(new Error('SparqlBenchmarkRunner test reject')));
      expect(await runner.isUp()).toBeFalsy();
    });

    it('returns false for a hanging request', async() => {
      fetcher.fetchBindings = jest.fn(async() => {
        const readable = new Readable();
        readable._read = () => {
          // Do nothing
        };
        return readable;
      });

      setImmediate(() => {
        jest.runAllTimers();
      });

      expect(await runner.isUp()).toBeFalsy();
    });
  });

  describe('sleep', () => {
    it('sleeps for a while', async() => {
      const resolved = jest.fn();
      runner.sleep(1_000)
        .then(resolved, () => {
          // Do nothing
        });
      expect(setTimeout).toHaveBeenCalledWith(expect.anything(), 1_000);
      expect(resolved).not.toHaveBeenCalled();
      jest.runAllTimers();
      await new Promise(setImmediate);
      expect(resolved).toHaveBeenCalled();
    });
  });

  describe('log', () => {
    it('invokes the logger', () => {
      runner.log('some message');
      expect(logger).toHaveBeenCalledWith('some message');
    });

    it('does not invoke an undefined logger', () => {
      runner = new SparqlBenchmarkRunner({
        endpoint: 'http://example.org/sparql',
        querySets,
        replication: 3,
        warmup: 2,
        timestampsRecording: false,
        logger: undefined,
      });
      runner.log('some message');
      expect(logger).not.toHaveBeenCalled();
    });
  });
});
