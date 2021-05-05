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
            id: '0',
            name: 'a',
            time: 25,
            timestamps: [],
          },
          a1: {
            count: 3,
            id: '1',
            name: 'a',
            time: 27,
            timestamps: [],
          },
          b0: {
            count: 3,
            id: '0',
            name: 'b',
            time: 29,
            timestamps: [],
          },
          b1: {
            count: 3,
            id: '1',
            name: 'b',
            time: 31,
            timestamps: [],
          },
        },
        'output.csv',
        false,
      );

      expect(lineWriter).toHaveBeenCalledTimes(5);
      expect(lineWriter).toHaveBeenCalledWith('name;id;results;time\n');
      expect(lineWriter).toHaveBeenCalledWith('a;0;3;25\n');
      expect(lineWriter).toHaveBeenCalledWith('a;1;3;27\n');
      expect(lineWriter).toHaveBeenCalledWith('b;0;3;29\n');
      expect(lineWriter).toHaveBeenCalledWith('b;1;3;31\n');
      expect(lineEnder).toHaveBeenCalled();
    });

    it('writes a CSV file with recordings', async() => {
      await writeBenchmarkResults(
        {
          a0: {
            count: 3,
            id: '0',
            name: 'a',
            time: 64,
            timestamps: [
              61,
              62,
              63,
            ],
          },
          a1: {
            count: 3,
            id: '1',
            name: 'a',
            time: 69,
            timestamps: [
              66,
              67,
              68,
            ],
          },
          b0: {
            count: 3,
            id: '0',
            name: 'b',
            time: 74,
            timestamps: [
              71,
              72,
              73,
            ],
          },
          b1: {
            count: 3,
            id: '1',
            name: 'b',
            time: 79,
            timestamps: [
              76,
              77,
              78,
            ],
          },
        },
        'output.csv',
        true,
      );

      expect(lineWriter).toHaveBeenCalledTimes(5);
      expect(lineWriter).toHaveBeenCalledWith('name;id;results;time;timestamps\n');
      expect(lineWriter).toHaveBeenCalledWith('a;0;3;64;61 62 63\n');
      expect(lineWriter).toHaveBeenCalledWith('a;1;3;69;66 67 68\n');
      expect(lineWriter).toHaveBeenCalledWith('b;0;3;74;71 72 73\n');
      expect(lineWriter).toHaveBeenCalledWith('b;1;3;79;76 77 78\n');
      expect(lineEnder).toHaveBeenCalled();
    });
  });
});
