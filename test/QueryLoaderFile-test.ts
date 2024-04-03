import type { Dirent } from 'node:fs';
import type * as fsPromises from 'node:fs/promises';
import { join } from 'node:path';
import type { IQueryLoader } from '../lib/QueryLoader';
import { QueryLoaderFile } from '../lib/QueryLoaderFile';

const queryFilesPath = '/tmp/queries';

const queryFiles: Record<string, string> = {
  'a.rq': 'A',
  'b.sparql': 'B1\n\nB2',
  'c.txt': 'C',
  'd.json': 'D',
};

jest.mock<typeof fsPromises>('node:fs/promises', () => <typeof fsPromises> <unknown> ({
  async readdir(path: string): Promise<Dirent[]> {
    if (path === queryFilesPath) {
      return Object.keys(queryFiles).map(file => (<Dirent> {
        name: file,
        path: queryFilesPath,
        isFile: () => true,
      }));
    }
    throw new Error(`Requested readdir outside mocked one: ${path}`);
  },
  async readFile(path: string): Promise<string> {
    for (const [ file, contents ] of Object.entries(queryFiles)) {
      const filePath = join(queryFilesPath, file);
      if (filePath === path) {
        return contents;
      }
    }
    throw new Error(`Requested readFile outside the mocked ones: ${path}`);
  },
}));

describe('QueryLoader', () => {
  let loader: IQueryLoader;

  beforeEach(() => {
    loader = new QueryLoaderFile(queryFilesPath);
  });

  it('should load all queries', async() => {
    const queries = await loader.loadQueries();
    const queriesExpected: Record<string, string[]> = {
      a: [ 'A' ],
      b: [ 'B1', 'B2' ],
      c: [ 'C' ],
    };
    expect(queries).toEqual(queriesExpected);
  });
});
