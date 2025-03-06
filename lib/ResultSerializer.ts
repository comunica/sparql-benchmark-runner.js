import type { IResult } from './Result';

export abstract class ResultSerializer implements IResultSerializer {
  protected readonly ignoreKeys?: string[];

  public constructor(options?: IResultSerializerOptions) {
    this.ignoreKeys = options?.ignoreKeys;
  }

  public async keys<T extends IResult>(results: T[]): Promise<string[]> {
    const keys = new Set<string>(results.flatMap(result => Object.keys(result)));
    for (const key of [ 'name', 'id', 'timestampsAll', ...this.ignoreKeys ?? [] ]) {
      keys.delete(key);
    }
    return [
      'name',
      'id',
      ...[ ...keys.values() ].sort((keyA, keyB) => keyA.localeCompare(keyB)),
      'timestampsAll',
    ];
  }

  public abstract serialize<T extends IResult>(path: string, results: T[]): Promise<void>;
}

export interface IResultSerializer {
  serialize: <T extends IResult>(path: string, results: T[]) => Promise<void>;
}

export interface IResultSerializerOptions {
  ignoreKeys?: string[];
}
