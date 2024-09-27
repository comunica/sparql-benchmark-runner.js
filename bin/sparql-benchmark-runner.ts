import { resolve } from 'node:path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import type { IQueryLoader } from '../lib/QueryLoader';
import { QueryLoaderFile } from '../lib/QueryLoaderFile';
import type { IAggregateResult } from '../lib/Result';
import type { IResultSerializer } from '../lib/ResultSerializer';
import { ResultSerializerCsv } from '../lib/ResultSerializerCsv';
import { SparqlBenchmarkRunner } from '../lib/SparqlBenchmarkRunner';

const logger = (message: string): boolean => process.stdout.write(`[${new Date().toISOString()}] ${message}\n`);

async function loadQueries(path: string): Promise<Record<string, string[]>> {
  const loader: IQueryLoader = new QueryLoaderFile({ path });
  logger(`Loading queries from ${path}`);
  return await loader.loadQueries();
}

async function serializeResults(path: string, results: IAggregateResult[]): Promise<void> {
  const serializer: IResultSerializer = new ResultSerializerCsv();
  logger(`Writing results to ${path}`);
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
      timeout: {
        type: 'number',
        description: 'Timeout value in seconds to use for individual queries',
        coerce: (arg: number) => arg * 1_000,
        number: true,
      },
    })
    .help()
    .parse();
  const querySets = await loadQueries(args.queries);
  const runner = new SparqlBenchmarkRunner({
    endpoint: args.endpoint,
    querySets,
    replication: args.replication,
    warmup: args.warmup,
    timeout: args.timeout,
    availabilityCheckTimeout: 1_000,
    logger,
  });
  const results: IAggregateResult[] = await runner.run();
  await serializeResults(args.output, results);
}

main().then().catch((error: Error) => logger(`${error.name}: ${error.message}\n${error.stack}`));
