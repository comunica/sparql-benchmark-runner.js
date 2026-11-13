import { createWriteStream } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { IResult } from './Result';
import { ResultSerializer } from './ResultSerializer';
import type { IResultSerializerOptions } from './ResultSerializer';

export class ResultSerializerRaw extends ResultSerializer {
  protected readonly columnSeparator: string;
  protected readonly arraySeparator: string;

  public constructor(options?: IResultSerializerRawOptions) {
    super(options);
    this.columnSeparator = options?.columnSeparator ?? ';';
    this.arraySeparator = options?.arraySeparator ?? ' ';
  }

  /**
   * Write raw results to JSON file.
   * Results are written one by one, as the JSON of all results can exceed the maximum string length.
   * @param path The destination file path.
   * @param results The benchmark results to serialize.
   */
  public async serialize<T extends IResult>(path: string, results: T[]): Promise<void> {
    await pipeline(Readable.from(this.serializeChunks(results)), createWriteStream(path, 'utf-8'));
  }

  /**
   * Serialize results to JSON in chunks,
   * which together equal `JSON.stringify(results, null, 2)`, with errors as their messages.
   * @param results The benchmark results to serialize.
   */
  public* serializeChunks<T extends IResult>(results: T[]): Generator<string> {
    if (results.length === 0) {
      yield '[]';
      return;
    }
    yield '[\n';
    for (const [ index, result ] of results.entries()) {
      const json = JSON.stringify({ ...result, error: result.error?.message ?? result.error }, null, 2);
      yield `  ${json.replaceAll('\n', '\n  ')}${index < results.length - 1 ? ',\n' : '\n]'}`;
    }
  }
}

export interface IResultSerializerRawOptions extends IResultSerializerOptions {
  columnSeparator: string;
  arraySeparator: string;
}
