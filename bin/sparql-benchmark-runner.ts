import { resolve } from 'node:path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import type { IQueryLoader, IQuerySetMetadata } from '../lib/QueryLoader';
import { QueryLoaderFile } from '../lib/QueryLoaderFile';
import type { IAggregateResult, IResult, IRunResult } from '../lib/Result';
import { ResultAggregatorComunica } from '../lib/ResultAggregatorComunica';
import { ResultAggregatorComunicaQuerySequence } from '../lib/ResultAggregatorComunicaQuerySequence';
import type { IResultSerializer } from '../lib/ResultSerializer';
import { ResultSerializerCsv } from '../lib/ResultSerializerCsv';
import { ResultSerializerRaw } from '../lib/ResultSerializerRaw';
import { SparqlBenchmarkRunner } from '../lib/SparqlBenchmarkRunner';

const logger = (message: string): boolean => process.stdout.write(`[${new Date().toISOString()}] ${message}\n`);

async function loadQueries(path: string): Promise<Record<string, string[]>> {
  const loader: IQueryLoader = new QueryLoaderFile({ path });
  logger(`Loading queries from ${path}`);
  return await loader.loadQueries();
}

async function loadQueryMetadata(path: string): Promise<Record<string, IQuerySetMetadata>> {
  const loader: IQueryLoader = new QueryLoaderFile({ path });
  logger(`Loading query metadata from ${path}`);
  return await loader.loadQueriesMetadata();
}

async function serializeResults(path: string, results: IAggregateResult[]): Promise<void> {
  const serializer: IResultSerializer = new ResultSerializerCsv();
  logger(`Writing results to ${path}`);
  await serializer.serialize(path, results);
}

async function serializeRawResults(path: string, results: IResult[]): Promise<void> {
  const serializer: IResultSerializer = new ResultSerializerRaw();
  logger(`Writing raw results to ${path}`);
  await serializer.serialize(path, results);
}

async function main(): Promise<void> {
  const args = await yargs(hideBin(process.argv))
    .options({
      endpoint: {
        type: 'string',
        description: 'URL of the SPARQL endpoint to send queries to',
        demandOption: true,
        string: true,
      },
      queries: {
        type: 'string',
        description: 'Directory of the queries',
        demandOption: true,
        coerce: (arg: string) => resolve(arg),
      },
      replication: {
        type: 'number',
        default: 5,
        description: 'Number of replication runs',
        number: true,
      },
      warmup: {
        type: 'number',
        default: 1,
        description: 'Number of warmup runs',
        number: true,
      },
      output: {
        type: 'string',
        default: './output.csv',
        description: 'Destination for the output CSV file',
        coerce: (arg: string) => resolve(arg),
      },
      outputRaw: {
        type: 'string',
        description: 'Destination for the raw JSON output file',
        coerce: (arg: string) => resolve(arg),
      },
      metadata: {
        type: 'boolean',
        default: false,
        description: 'Load query metadata files (*.metadata.json) and enable sequence aggregation',
      },
      invalidateCacheAfterQuerySet: {
        type: 'boolean',
        default: false,
        description: 'Send a cache invalidation request after each query set execution',
      },

      timeout: {
        type: 'number',
        description: 'Timeout value in seconds to use for individual queries',
        coerce: (arg: number) => arg * 1_000,
        number: true,
      },
      recoveryQuery: {
        type: 'string',
        description: 'SELECT or ASK query that must succeed after a failed query, before the next query is executed',
        string: true,
      },
      resultConsistency: {
        type: 'string',
        choices: <const> [ 'hash', 'count' ],
        default: <const> 'hash',
        description: 'How the results of the executions of a query are compared: their hashes, or only their counts',
      },
    })
    .help()
    .parse();
  const querySets = await loadQueries(args.queries);
  const querySetsMetadata = args.metadata ? await loadQueryMetadata(args.queries) : undefined;

  const runner = new SparqlBenchmarkRunner({
    resultAggregator: args.metadata ?
      new ResultAggregatorComunicaQuerySequence({ resultConsistency: args.resultConsistency }) :
      new ResultAggregatorComunica({ resultConsistency: args.resultConsistency }),
    endpoint: args.endpoint,
    querySets,
    querySetsMetadata,
    replication: args.replication,
    warmup: args.warmup,
    timeout: args.timeout,
    availabilityCheckTimeout: 1_000,
    logger,
    invalidateCacheBetweenSetExecutions: args.invalidateCacheAfterQuerySet,
    recoveryQuery: args.recoveryQuery,
  });

  const results: IRunResult = await runner.runWithRawResults();
  await serializeResults(args.output, results.aggregateResults);
  const outputRaw = args.outputRaw ?? (args.metadata ? resolve('./output-raw.json') : undefined);
  if (results.rawResults && outputRaw) {
    await serializeRawResults(outputRaw, results.rawResults);
  }
}

main().then().catch((error: Error) => logger(`${error.name}: ${error.message}\n${error.stack}`));
