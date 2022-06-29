import { SparqlEndpointFetcher } from 'fetch-sparql-endpoint';
import type { IBenchmarkResults } from './IBenchmarkResults';

/**
 * Executes query sets against a SPARQL endpoint.
 */
export class SparqlBenchmarkRunner {
  private readonly endpoint: string;
  private readonly querySets: Record<string, string[]>;
  private readonly replication: number;
  private readonly warmup: number;
  private readonly timestampsRecording: boolean;
  private readonly logger?: (message: string) => void;
  private readonly upQuery: string;

  private readonly fetcher: SparqlEndpointFetcher;

  public constructor(options: ISparqlBenchmarkRunnerArgs) {
    this.endpoint = options.endpoint;
    this.querySets = options.querySets;
    this.replication = options.replication;
    this.warmup = options.warmup;
    this.timestampsRecording = options.timestampsRecording;
    this.logger = options.logger;
    this.upQuery = options.upQuery || 'SELECT * WHERE { ?s ?p ?o } LIMIT 1';

    this.fetcher = new SparqlEndpointFetcher();
  }

  /**
   * Once the endpoint is live,
   * execute all query sets against the SPARQL endpoint.
   * Afterwards, all results are collected and averaged.
   */
  public async run(options: IRunOptions = {}): Promise<IBenchmarkResults> {
    // Await query execution until the endpoint is live
    await this.waitUntilUp();

    // Execute queries in warmup
    this.log(`Warming up for ${this.warmup} rounds\n`);
    await this.executeQueries({}, this.warmup);

    // Execute queries
    const results: IBenchmarkResults = {};
    this.log(`Executing ${Object.keys(this.querySets).length} queries with replication ${this.replication}\n`);
    if (options.onStart) {
      await options.onStart();
    }
    await this.executeQueries(results, this.replication);
    if (options.onStop) {
      await options.onStop();
    }

    // Average results
    for (const key in results) {
      results[key].time = Math.floor(results[key].time / this.replication);
      results[key].timestamps = results[key].timestamps.map(t => Math.floor(t / this.replication));
    }

    return results;
  }

  /**
   * Execute all queries against the endpoint.
   * @param data The results to append to.
   * @param iterations The number of times to iterate.
   */
  public async executeQueries(data: IBenchmarkResults, iterations: number): Promise<void> {
    this.log('Executing query ');
    for (let iteration = 0; iteration < iterations; iteration++) {
      for (const name in this.querySets) {
        const test = this.querySets[name];
        // eslint-disable-next-line @typescript-eslint/no-for-in-array
        for (const id in test) {
          this.log(`\rExecuting query ${name}:${id} for iteration ${iteration + 1}/${iterations}`);
          const query = test[id];
          try {
            const { count, time, timestamps } = await this.executeQuery(query);
            if (!data[name + id]) {
              data[name + id] = { name, id, count, time, timestamps, error: false };
            } else {
              data[name + id].time += time;
              const dataEntry = data[name + id];

              // Combine timestamps
              const length = Math.min(dataEntry.timestamps.length, timestamps.length);
              for (let i = 0; i < length; ++i) {
                dataEntry.timestamps[i] += timestamps[i];
              }
            }
          } catch (error: unknown) {
            // Mark result as errored
            data[name + id] = { name, id, count: 0, time: 0, timestamps: [], error: true };

            this.log(`\rError occurred at query ${name}:${id} for iteration ${iteration + 1}/${iterations}: ${(<Error> error).message}\n`);

            // Wait until the endpoint is properly live again
            await new Promise(resolve => setTimeout(resolve, 3_000));
            await this.waitUntilUp();
          }
        }
      }
    }
    this.log(`"\rExecuted all queries\n`);
  }

  /**
   * Execute a single query
   * @param query A SPARQL query string
   */
  public async executeQuery(query: string): Promise<{ count: number; time: number; timestamps: number[] }> {
    const results = await this.fetcher.fetchBindings(this.endpoint, query);
    return new Promise((resolve, reject) => {
      const hrstart = process.hrtime();
      let count = 0;
      const timestamps: number[] = [];
      results.on('data', () => {
        count++;
        if (this.timestampsRecording) {
          timestamps.push(this.countTime(hrstart));
        }
      });
      results.on('error', reject);
      results.on('end', () => {
        resolve({ count, time: this.countTime(hrstart), timestamps });
      });
    });
  }

  /**
   * Based on a hrtime start, obtain the duration.
   * @param hrstart process.hrtime
   */
  public countTime(hrstart: [number, number]): number {
    const hrend = process.hrtime(hrstart);
    return hrend[0] * 1_000 + hrend[1] / 1_000_000;
  }

  /**
   * Check if the SPARQL endpoint is available.
   */
  public async isUp(): Promise<boolean> {
    try {
      const results = await this.fetcher.fetchBindings(this.endpoint, this.upQuery);
      return new Promise<boolean>(resolve => {
        results.on('error', () => resolve(false));
        results.on('data', () => {
          // Do nothing
        });
        results.on('end', () => resolve(true));
      });
    } catch {
      return false;
    }
  }

  /**
   * Wait until the SPARQL endpoint is available.
   */
  public async waitUntilUp(): Promise<void> {
    while (!await this.isUp()) {
      await this.sleep(1_000);
      this.log('Endpoint not available yet, waiting for 1 second\n');
    }
  }

  /**
   * Sleep for a given amount of time.
   * @param durationMs A duration in milliseconds.
   */
  public async sleep(durationMs: number): Promise<void> {
    return new Promise<void>(resolve => setTimeout(resolve, durationMs));
  }

  /**
   * Log a message.
   * @param message Message to log.
   */
  public log(message: string): void {
    return this.logger?.call(this.logger, message);
  }
}

export interface ISparqlBenchmarkRunnerArgs {
  /**
   * URL of the SPARQL endpoint to send queries to.
   */
  endpoint: string;
  /**
   * Mapping of query set name to an array of SPARQL query strings in this set.
   */
  querySets: Record<string, string[]>;
  /**
   * Number of replication runs.
   */
  replication: number;
  /**
   * Number of warmup runs.
   */
  warmup: number;
  /**
   * If a timestamps column should be added with result arrival times.
   */
  timestampsRecording: boolean;
  /**
   * Destination for log messages.
   * @param message Message to log.
   */
  logger?: (message: string) => void;
  /**
   * SPARQL SELECT query that will be sent to the endpoint to check if it is up.
   */
  upQuery?: string;
}

export interface IRunOptions {
  /**
   * A listener for when the actual query executions have started.
   */
  onStart?: () => Promise<void>;
  /**
   * A listener for when the actual query executions have stopped.
   */
  onStop?: () => Promise<void>;
}
