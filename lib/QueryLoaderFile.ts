import { readdir, readFile } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';
import type { IQueryLoader } from './QueryLoader';

export class QueryLoaderFile implements IQueryLoader {
  protected readonly path: string;
  protected readonly extensions: Set<string>;

  public constructor(options: IQueryLoaderFileOptions) {
    this.path = resolve(options.path);
    this.extensions = new Set<string>(options.extensions ?? [ '.txt', '.sparql', '.rq' ]);
  }

  public async loadQueries(): Promise<Record<string, string[]>> {
    const querySets: Record<string, string[]> = {};
    await QueryLoaderFile.loadQueriesStatic(querySets, this.path, this.extensions);
    return querySets;
  }

  protected static async loadQueriesStatic(
    querySets: Record<string, string[]>,
    path: string,
    extensions: Set<string>,
    prefix = '',
  ): Promise<void> {
    const querySeparator = '\n\n';
    for (const dirent of await readdir(path, { encoding: 'utf-8', withFileTypes: true })) {
      if (dirent.isFile()) {
        const extension = extname(dirent.name);
        if (extensions.has(extension)) {
          const fileContents = await readFile(join(path, dirent.name), { encoding: 'utf-8' });
          const queries = fileContents.split(querySeparator)
            .map(query => query.trim())
            .filter(query => query.length > 0);
          querySets[prefix + dirent.name.replace(extension, '')] = queries;
        }
      } else if (dirent.isDirectory()) {
        await QueryLoaderFile.loadQueriesStatic(querySets, join(path, dirent.name), extensions, `${prefix}${dirent.name}/`);
      }
    }
  }
}

export interface IQueryLoaderFileOptions {
  /**
   * The path to load the queries from on disk.
   */
  path: string;
  /**
   * File extensions to detect as SPARQL queries.
   */
  extensions?: string[];
}
