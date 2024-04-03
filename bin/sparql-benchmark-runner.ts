import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { type IQueryLoader, QueryLoader } from '../lib/QueryLoader';
import type { IAggregateResult } from '../lib/Result';
import type { IResultSerializer } from '../lib/ResultSerializer';
import { ResultSerializerCsv } from '../lib/ResultSerializerCsv';
import { SparqlBenchmarkRunner } from '../lib/SparqlBenchmarkRunner';

const logger = (message: string): boolean => process.stdout.write(`[${new Date().toISOString()}] ${message}\n`);

async function loadQueries(path: string): Promise<Record<string, string[]>> {
  const loader: IQueryLoader = new QueryLoader(path);
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
      endpoint: { type: 'string', description: 'URL of the SPARQL endpoint to send queries to', demandOption: true },
      queries: { type: 'string', description: 'Directory of the queries', demandOption: true },
      replication: { type: 'number', default: 5, description: 'Number of replication runs' },
      warmup: { type: 'number', default: 0, description: 'Number of warmup runs' },
      output: { type: 'string', default: 'output.csv', description: 'Destination for the output CSV file' },
      timeout: { type: 'number', description: 'Timeout value in seconds to use for individual queries' },
    })
    .help()
    .parse();
  const querySets = await loadQueries(args.queries);
  const runner = new SparqlBenchmarkRunner({
    endpoint: args.endpoint,
    querySets,
    replication: args.replication,
    warmup: args.warmup,
    timeout: args.timeout ? args.timeout * 1_000 : undefined,
    availabilityCheckTimeout: 1_000,
    logger,
  });
  const results: IAggregateResult[] = await runner.run();
  await serializeResults(args.output, results);
}

main().then().catch((error: Error) => logger(`${error.name}: ${error.message}\n${error.stack}`));
