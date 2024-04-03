import { readdir, readFile } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';

export interface IQueryLoader {
  loadQueries: () => Promise<Record<string, string[]>>;
}

export class QueryLoader implements IQueryLoader {
  protected readonly path: string;

  public constructor(path: string) {
    this.path = resolve(path);
  }

  public async loadQueries(): Promise<Record<string, string[]>> {
    const querySets: Record<string, string[]> = {};
    const querySeparator = '\n\n';
    const sparqlFileExtensions = new Set<string>([ '.txt', '.sparql', '.rq' ]);
    for (const file of await readdir(this.path, { encoding: 'utf-8', withFileTypes: true })) {
      const extension = extname(file.name);
      if (file.isFile() && sparqlFileExtensions.has(extension)) {
        const fileContents = await readFile(join(file.path, file.name), { encoding: 'utf-8' });
        const queries = fileContents.split(querySeparator);
        querySets[file.name.replace(extension, '')] = queries;
      }
    }
    return querySets;
  }
}
