import type { Dirent } from 'node:fs';
import type * as fsPromises from 'node:fs/promises';
import { join } from 'node:path';
import type { IQueryLoader } from '../lib/QueryLoader';
import { QueryLoaderFile } from '../lib/QueryLoaderFile';

const queryFilesPath = '/tmp/queries';

const queryFiles: Record<string, string> = {
  'a.rq': 'A',
  'b.sparql': 'B1\n\nB2\n\n\n\n',
  'c.txt': 'C',
  'd.json': 'D',
  'dir/': 'true',
};
const queryFilesSub: Record<string, string> = {
  'e.sparql': 'E',
};

jest.mock<typeof fsPromises>('node:fs/promises', () => <typeof fsPromises> <unknown> ({
  async readdir(path: string): Promise<Dirent[]> {
    if (path === queryFilesPath) {
      return Object.keys(queryFiles).map(file => (<Dirent> {
        name: file.at(-1) === '/' ? file.slice(0, -1) : file,
        isFile: () => file.at(-1) !== '/',
        isDirectory: () => file.at(-1) === '/',
      }));
    }
    if (path === join(queryFilesPath, 'dir')) {
      return Object.keys(queryFilesSub).map(file => (<Dirent> {
        name: file.at(-1) === '/' ? file.slice(0, -1) : file,
        isFile: () => file.at(-1) !== '/',
        isDirectory: () => file.at(-1) === '/',
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
    for (const [ file, contents ] of Object.entries(queryFilesSub)) {
      const filePath = join(join(queryFilesPath, 'dir'), file);
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
    loader = new QueryLoaderFile({ path: queryFilesPath });
  });

  it('should load all queries', async() => {
    const queries = await loader.loadQueries();
    const queriesExpected: Record<string, string[]> = {
      a: [ 'A' ],
      b: [ 'B1', 'B2' ],
      c: [ 'C' ],
      'dir/e': [ 'E' ],
    };
    expect(queries).toEqual(queriesExpected);
  });
});
