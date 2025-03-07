import { createWriteStream } from 'node:fs';
import type { IResult } from './Result';
import { ResultSerializer } from './ResultSerializer';
import type { IResultSerializerOptions } from './ResultSerializer';

export class ResultSerializerCsv extends ResultSerializer {
  protected readonly columnSeparator: string;
  protected readonly arraySeparator: string;

  public constructor(options?: IResultSerializerCsvOptions) {
    super(options);
    this.columnSeparator = options?.columnSeparator ?? ';';
    this.arraySeparator = options?.arraySeparator ?? ' ';
  }

  public keys<T extends IResult>(results: T[]): Promise<string[]> {
    // This ensures that every CSV line has 'error' column as boolean,
    // and the 'errorDescription' field as the description of the error
    for (const result of results.filter(res => !('errorDescription' in res))) {
      if (result.error) {
        (<any>result).errorDescription = result.error;
        (<any>result).error = true;
      } else {
        (<any>result).errorDescription = '';
        (<any>result).error = false;
      }
    }
    return super.keys(results);
  }

  /**
   * Write benchmark results to a CSV file.
   * @param path The destination file path.
   * @param results The benchmark results to serialize.
   */
  public async serialize<T extends IResult>(path: string, results: T[]): Promise<void> {
    const keys = await this.keys(results);
    const csvFileStream = createWriteStream(path);
    csvFileStream.write(`${keys.join(this.columnSeparator)}\n`);
    for (const result of results) {
      const values: string[] = [];
      for (const key of keys) {
        if (key in result) {
          // eslint-disable-next-line ts/no-unsafe-assignment
          const value = result[key];
          switch (typeof value) {
            case 'bigint':
            case 'boolean':
            case 'number':
            case 'string':
              values.push(value.toString());
              break;
            case 'object':
              if (Array.isArray(value)) {
                // Nested arrays are saved as strings
                if (Array.isArray(value[0])) {
                  values.push(`"${JSON.stringify(value)}"`);
                } else {
                  values.push(value.join(this.arraySeparator));
                }
              } else if (value instanceof Error) {
                values.push(value.message);
              } else {
                values.push(<string>value.constructor.name);
              }
              break;
            case 'function':
              values.push(<string>value.name);
              break;
            case 'symbol':
              values.push(value.description ?? '');
              break;
            case 'undefined':
            default:
              values.push('');
              break;
          }
        } else {
          values.push('');
        }
      }
      csvFileStream.write(`${values.join(this.columnSeparator)}\n`);
    }
    csvFileStream.end();
  }
}

export interface IResultSerializerCsvOptions extends IResultSerializerOptions {
  columnSeparator: string;
  arraySeparator: string;
}
