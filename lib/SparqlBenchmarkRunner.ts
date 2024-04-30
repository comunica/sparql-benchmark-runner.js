import { createHash, type Hash } from 'node:crypto';
import type * as RDF from '@rdfjs/types';
import { SparqlEndpointFetcher } from 'fetch-sparql-endpoint';
import { termToString } from 'rdf-string';
import type { IResult, IResultMetadata, IAggregateResult } from './Result';
import type { IResultAggregator } from './ResultAggregator';
import { ResultAggregatorComunica } from './ResultAggregatorComunica';

/**
 * Executes query sets against a SPARQL endpoint.
 */
export class SparqlBenchmarkRunner {
  protected readonly endpoint: string;
  protected readonly timeout?: number;
  protected readonly requestDelay?: number;
  protected readonly replication: number;
  protected readonly warmup: number;
  protected readonly querySets: Record<string, string[]>;
  protected readonly bindingsHashAlgorithm: string;
  protected readonly logger?: (message: string) => void;
  protected readonly resultAggregator: IResultAggregator;
  protected readonly availabilityCheckTimeout: number;
  protected readonly endpointFetcher: SparqlEndpointFetcher;

  public constructor(options: ISparqlBenchmarkRunnerArgs) {
    this.logger = options.logger;
    this.resultAggregator = options.resultAggregator ?? new ResultAggregatorComunica();
    this.endpoint = options.endpoint;
    this.querySets = options.querySets;
    this.replication = options.replication;
    this.warmup = options.warmup;
    this.timeout = options.timeout;
    this.requestDelay = options.requestDelay;
    this.bindingsHashAlgorithm = 'md5';
    this.availabilityCheckTimeout = options.availabilityCheckTimeout ?? 10_000;
    this.endpointFetcher = new SparqlEndpointFetcher({
      additionalUrlParams: options.additionalUrlParams,
      timeout: options.timeout,
    });
  }

  /**
   * Once the endpoint is live,
   * execute all query sets against the SPARQL endpoint.
   * Afterwards, all results are collected and averaged.
   */
  public async run(options: IRunOptions = {}): Promise<IAggregateResult[]> {
    // Execute queries in warmup
    if (this.warmup > 0) {
      await this.executeAllQueries(this.warmup, true);
    }

    // Execute queries
    if (options.onStart) {
      await options.onStart();
    }

    const results = await this.executeAllQueries(this.replication);

    if (options.onStop) {
      await options.onStop();
    }

    const aggregateResults = this.resultAggregator.aggregateResults(results);

    return aggregateResults;
  }

  /**
   * Executes all queries from the runner's query sets, outputting the results.
   * @param replication The number of executions per individual query.
   * @param warmup Whether the executions are intended for warmup purposes only.
   * @returns The query reults, unless warmup is specified.
   */
  public async executeAllQueries(replication: number, warmup = false): Promise<IResult[]> {
    const totalQuerySets = Object.keys(this.querySets).length;
    const totalQueries = Object.values(this.querySets).map(qs => qs.length).reduce((acc, qsl) => acc + qsl);
    const startTime = Date.now();

    if (warmup) {
      this.log(`Warming up by executing ${totalQuerySets} query sets, containing ${totalQueries} queries, for ${replication} rounds`);
    } else {
      this.log(`Executing ${totalQuerySets} query sets, containing ${totalQueries} queries, with replication of ${replication}`);
    }

    let finishedExecutions = 0;
    const totalExecutions = (totalQueries * replication).toString();
    const results: IResult[] = [];

    for (const [ name, queryStrings ] of Object.entries(this.querySets)) {
      for (let i = 0; i < replication; i++) {
        for (const [ id, queryString ] of queryStrings.entries()) {
          this.log(`Execute: ${(++finishedExecutions).toString().padStart(totalExecutions.length, ' ')} / ${totalExecutions} <${name}#${id}>`);
          await this.waitForEndpoint();
          if (this.requestDelay) {
            await this.sleep(this.requestDelay);
          }
          const result = await this.executeQuery(name, id.toString(), queryString);
          if (!warmup) {
            results.push(result);
          }
          if (this.requestDelay) {
            await this.sleep(this.requestDelay);
          }
        }
      }
    }

    this.log(`${warmup ? 'Warmup' : 'Executions'} done in ${Math.round((Date.now() - startTime) / 60_000)} minutes`);

    return results;
  }

  /**
   * Executes a single query against the endpoint.
   * @param name The query set name.
   * @param id The query index within the query set.
   * @param queryString The SPARQL query string.
   * @returns The query result.
   */
  public async executeQuery(name: string, id: string, queryString: string): Promise<IResult> {
    let timeoutHandle: NodeJS.Timeout | undefined;
    const bindingsStrings: string[] = [];
    const hrstart = process.hrtime();

    const result: IResult = {
      name,
      id,
      resultHash: '',
      resultCount: 0,
      duration: 0,
      timestamps: [],
    };

    const timeoutPromise = new Promise<void>((resolve, reject) => {
      if (this.timeout) {
        // When timeout is not set, this promise will never reject or resolve
        timeoutHandle = setTimeout(() => {
          reject(new Error(`Query timed out after ${Math.round(this.timeout! / 1_000)} seconds client-side`));
        }, this.timeout);
      }
    });

    const queryPromise = new Promise<void>((resolve, reject) => {
      this.endpointFetcher.fetchBindings(this.endpoint, queryString)
        .then(bindingsStream => bindingsStream
          .on('metadata', (metadata: IResultMetadata) => {
            for (const [ key, value ] of Object.entries(metadata)) {
              // eslint-disable-next-line ts/no-unsafe-assignment
              result[key] = value;
            }
          })
          .on('data', (bindings: Record<string, RDF.Term>) => {
            result.timestamps.push(Math.round(this.countTime(hrstart)));
            result.resultCount++;
            bindingsStrings.push(this.bindingsToString(bindings));
          })
          .on('end', resolve).on('error', reject)).catch(reject);
    });

    try {
      await Promise.race([ queryPromise, timeoutPromise ]);
    } catch (error: unknown) {
      result.error = <Error>error;
      this.log(`${result.error.name}: ${result.error.message}`);
    }

    clearTimeout(timeoutHandle);
    result.duration = Math.round(this.countTime(hrstart));

    const bindingsHash: Hash = createHash(this.bindingsHashAlgorithm, { encoding: 'utf-8' });
    for (const bindingsString of bindingsStrings.sort((bindA, bindB) => bindA.localeCompare(bindB))) {
      bindingsHash.update(bindingsString);
    }
    result.resultHash = bindingsHash.digest('hex');

    return result;
  }

  /**
   * Convert result bindings to string, while ensuring that the keys
   * are always serialized in the same order through sorting.
   */
  public bindingsToString(bindings: Record<string, RDF.Term>): string {
    const bindingsToSerialize: Record<string, string> = Object.fromEntries(Object.entries(bindings)
      .sort(([ keyA ], [ keyB ]) => keyA.localeCompare(keyB))
      .map(([ key, term ]) => [ key, termToString(term) ]));
    return JSON.stringify(bindingsToSerialize);
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
  public async endpointAvailable(): Promise<boolean> {
    let timeoutHandle: NodeJS.Timeout | undefined;
    const promiseTimeout = new Promise<boolean>((resolve) => {
      timeoutHandle = setTimeout(() => resolve(false), this.availabilityCheckTimeout);
    });
    const promiseFetch = new Promise<boolean>((resolve) => {
      fetch(this.endpoint, {
        method: 'HEAD',
      }).then(respose => resolve(respose.ok)).catch(() => resolve(false));
    });
    const available = await Promise.race([ promiseTimeout, promiseFetch ]);
    clearTimeout(timeoutHandle);
    return available;
  }

  /**
   * Wait until the SPARQL endpoint is available.
   */
  public async waitForEndpoint(): Promise<void> {
    const hrstart = process.hrtime();
    const elapsed = (): number => Math.round(this.countTime(hrstart) / 1_000);
    while (!await this.endpointAvailable()) {
      await this.sleep(1_000);
      this.log(`Endpoint not available yet, waited for ${elapsed()} seconds...`);
    }
    this.log(`Endpoint available after ${elapsed()} seconds`);
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
   * Destination for log messages.
   * @param message Message to log.
   */
  logger?: (message: string) => void;
  /**
   * Query result aggregator, used to average the results across replications.
   */
  resultAggregator?: IResultAggregator;
  /**
   * Additional URL parameters that must be sent to the endpoint.
   */
  additionalUrlParams?: URLSearchParams;
  /**
   * A timeout for query execution in milliseconds.
   *
   * If the timeout is reached, the query request will NOT be aborted.
   * Instead, the query is assumed to have silently failed.
   *
   * This timeout is only supposed to be used as a fallback to an endpoint-driven timeout.
   */
  timeout?: number;
  /**
   * A timeout in milliseconds for checking whether the SPARQL endpoint is up.
   */
  availabilityCheckTimeout?: number;
  /**
   * The delay between subsequent requests sent to the server.
   */
  requestDelay?: number;
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
