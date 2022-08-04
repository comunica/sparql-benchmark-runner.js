import * as fs from 'fs';
import * as Path from 'path';
import type { IBenchmarkResults } from './IBenchmarkResults';

/**
 * Read query sets from a given directory.
 *
 * A directory can contain multiple files ending with the .txt or .sparql suffix.
 * Each of those files can contain multiple SPARQL queries, separated by empty lines.
 *
 * @param queryDirectory Path to a query directory.
 * @return Mapping of query set name to an array of SPARQL query strings in this set.
 */
export async function readQueries(queryDirectory: string): Promise<Record<string, string[]>> {
  const querySets: Record<string, string[]> = {};
  const filenames = (await fs.promises.readdir(queryDirectory))
    .filter((filename: string) => filename.endsWith('.txt') || filename.endsWith('.sparql'));
  for (const filename of filenames) {
    const queries = (await fs.promises.readFile(Path.join(queryDirectory, filename), 'utf8'))
      .split('\n\n')
      .filter(query => query.length > 0);
    const queryName = filename.replace(/\..*$/u, '');
    querySets[queryName] = queries;
  }
  return querySets;
}

/**
 * Write benchmark results to a CSV file.
 * @param results Benchmark results.
 * @param outputFile Destination CSV file path.
 * @param timestampsRecording If timestamps were recorded during benchmarking.
 * @param metadataKeys The keys inside the metadata to emit. These will also be added to the CSV file header.
 */
export async function writeBenchmarkResults(
  results: IBenchmarkResults,
  outputFile: string,
  timestampsRecording: boolean,
  metadataKeys: string[] = [],
): Promise<void> {
  const out = fs.createWriteStream(outputFile);
  out.write(`name;id;results;time;error${timestampsRecording ? ';timestamps' : ''}${metadataKeys.length > 0 ? `;${metadataKeys.join(';')}` : ''}\n`);
  for (const key in results) {
    const { name, id, count, time, error, timestamps, metadata } = results[key];
    out.write(`${name};${id};${count};${time};${error}${
      timestampsRecording ?
        `;${timestamps.join(' ')}` :
        ''}${
      metadataKeys.length > 0 ?
        `;${metadataKeys.map(metadataKey => metadata[metadataKey]).join(';')}` :
        ''}\n`);
  }
  out.end();
}
