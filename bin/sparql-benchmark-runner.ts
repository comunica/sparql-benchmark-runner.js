import * as yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { readQueries, writeBenchmarkResults } from '../lib/BenchmarkInputOutput';
import { SparqlBenchmarkRunner } from '../lib/SparqlBenchmarkRunner';

const { argv: params } = yargs(hideBin(process.argv))
  .options({
    endpoint: {
      alias: 'e',
      type: 'string',
      describe: 'URL of the SPARQL endpoint to send queries to',
      demandOption: true,
    },
    queries: { alias: 'q', type: 'string', describe: 'Directory of the queries', demandOption: true },
    replication: { alias: 'r', type: 'number', default: 5, describe: 'Number of replication runs' },
    warmup: { alias: 'w', type: 'number', default: 0, describe: 'Number of warmup runs' },
    output: { alias: 'o', type: 'string', default: 'output.csv', describe: 'Destination for the output CSV file' },
    timestamps: {
      alias: 't',
      type: 'boolean',
      default: false,
      describe: 'If a timestamps column should be added with result arrival times',
    },
  })
  .help();

(async function run() {
  // Run benchmark
  const results = await new SparqlBenchmarkRunner({
    endpoint: params.endpoint,
    querySets: await readQueries(params.queries),
    replication: params.replication,
    warmup: params.warmup,
    timestampsRecording: params.timestamps,
    logger: (message: string) => process.stdout.write(message),
  }).run();

  // Write results
  process.stdout.write(`Writing results to ${params.output}\n`);
  await writeBenchmarkResults(results, params.output, params.timestamps);
})().catch((error: Error) => process.stderr.write(`${<any> error.stack}\n`));
