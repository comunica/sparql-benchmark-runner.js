import { readQueries, writeBenchmarkResults } from '../lib/BenchmarkInputOutput';

let files: Record<string, string> = {};
let filesOut: Record<string, string> = {};
const lineWriter: any = jest.fn();
const lineEnder: any = jest.fn();
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  createWriteStream: () => ({
    write: lineWriter,
    end: lineEnder,
  }),
  promises: {
    async readdir(dir: string) {
      return Object.keys(files)
        .filter(file => file.startsWith(dir))
        .map(file => file.slice(dir.length + 1));
    },
    async readFile(filePath: string) {
      if (filePath in files) {
        return files[filePath];
      }
      throw new Error(`Unknown file in BenchmarkInputOutput tests: ${filePath}`);
    },
  },
}));

describe('BenchmarkInputOutput', () => {
  beforeEach(() => {
    files = {
      'dir/a.txt': 'A1\n\nA2',
      'dir/b.sparql': 'B1',
      'dir/thing.ttl': 'STUFF',
      'bdir/c.txt': 'C',
    };
    filesOut = {};
    jest.resetAllMocks();
  });

  describe('readQueries', () => {
    it('reads a directory', async() => {
      expect(await readQueries('dir')).toEqual({
        a: [
          'A1',
          'A2',
        ],
        b: [
          'B1',
        ],
      });
    });
  });

  describe('writeBenchmarkResults', () => {
    it('writes a CSV file without recordings', async() => {
      await writeBenchmarkResults(
        {
          a0: {
            count: 3,
            error: false,
            id: '0',
            name: 'a',
            time: 25,
            timestamps: [],
            metadata: {},
          },
          a1: {
            count: 3,
            error: false,
            id: '1',
            name: 'a',
            time: 27,
            timestamps: [],
            metadata: {},
          },
          b0: {
            count: 3,
            error: false,
            id: '0',
            name: 'b',
            time: 29,
            timestamps: [],
            metadata: {},
          },
          b1: {
            count: 3,
            error: false,
            id: '1',
            name: 'b',
            time: 31,
            timestamps: [],
            metadata: {},
          },
        },
        'output.csv',
        false,
      );

      expect(lineWriter).toHaveBeenCalledTimes(5);
      expect(lineWriter).toHaveBeenCalledWith('name;id;results;time;error\n');
      expect(lineWriter).toHaveBeenCalledWith('a;0;3;25;false\n');
      expect(lineWriter).toHaveBeenCalledWith('a;1;3;27;false\n');
      expect(lineWriter).toHaveBeenCalledWith('b;0;3;29;false\n');
      expect(lineWriter).toHaveBeenCalledWith('b;1;3;31;false\n');
      expect(lineEnder).toHaveBeenCalled();
    });

    it('writes a CSV file with recordings', async() => {
      await writeBenchmarkResults(
        {
          a0: {
            count: 3,
            error: false,
            id: '0',
            name: 'a',
            time: 64,
            timestamps: [
              61,
              62,
              63,
            ],
            metadata: {},
          },
          a1: {
            count: 3,
            error: false,
            id: '1',
            name: 'a',
            time: 69,
            timestamps: [
              66,
              67,
              68,
            ],
            metadata: {},
          },
          b0: {
            count: 3,
            error: false,
            id: '0',
            name: 'b',
            time: 74,
            timestamps: [
              71,
              72,
              73,
            ],
            metadata: {},
          },
          b1: {
            count: 3,
            error: false,
            id: '1',
            name: 'b',
            time: 79,
            timestamps: [
              76,
              77,
              78,
            ],
            metadata: {},
          },
        },
        'output.csv',
        true,
      );

      expect(lineWriter).toHaveBeenCalledTimes(5);
      expect(lineWriter).toHaveBeenCalledWith('name;id;results;time;error;timestamps\n');
      expect(lineWriter).toHaveBeenCalledWith('a;0;3;64;false;61 62 63\n');
      expect(lineWriter).toHaveBeenCalledWith('a;1;3;69;false;66 67 68\n');
      expect(lineWriter).toHaveBeenCalledWith('b;0;3;74;false;71 72 73\n');
      expect(lineWriter).toHaveBeenCalledWith('b;1;3;79;false;76 77 78\n');
      expect(lineEnder).toHaveBeenCalled();
    });

    it('writes a CSV file with recordings and metadata keys', async() => {
      await writeBenchmarkResults(
        {
          a0: {
            count: 3,
            error: false,
            id: '0',
            name: 'a',
            time: 64,
            timestamps: [
              61,
              62,
              63,
            ],
            metadata: {
              keyA: '1.1',
              keyB: '2.1',
              keyC: '3.1',
            },
          },
          a1: {
            count: 3,
            error: false,
            id: '1',
            name: 'a',
            time: 69,
            timestamps: [
              66,
              67,
              68,
            ],
            metadata: {
              keyA: '1.2',
              keyB: '2.2',
              keyC: '3.2',
            },
          },
          b0: {
            count: 3,
            error: false,
            id: '0',
            name: 'b',
            time: 74,
            timestamps: [
              71,
              72,
              73,
            ],
            metadata: {
              keyA: '1.3',
              keyB: '2.3',
              keyC: '3.3',
            },
          },
          b1: {
            count: 3,
            error: false,
            id: '1',
            name: 'b',
            time: 79,
            timestamps: [
              76,
              77,
              78,
            ],
            metadata: {
              keyA: '1.4',
              keyB: '2.4',
              keyC: '3.4',
            },
          },
        },
        'output.csv',
        true,
        [ 'keyA', 'keyB' ],
      );

      expect(lineWriter).toHaveBeenCalledTimes(5);
      expect(lineWriter).toHaveBeenCalledWith('name;id;results;time;error;timestamps;keyA;keyB\n');
      expect(lineWriter).toHaveBeenCalledWith('a;0;3;64;false;61 62 63;1.1;2.1\n');
      expect(lineWriter).toHaveBeenCalledWith('a;1;3;69;false;66 67 68;1.2;2.2\n');
      expect(lineWriter).toHaveBeenCalledWith('b;0;3;74;false;71 72 73;1.3;2.3\n');
      expect(lineWriter).toHaveBeenCalledWith('b;1;3;79;false;76 77 78;1.4;2.4\n');
      expect(lineEnder).toHaveBeenCalled();
    });
  });
});
