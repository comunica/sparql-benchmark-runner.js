import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { IResult } from '../lib/Result';
import { ResultSerializerRaw } from '../lib/ResultSerializerRaw';

describe('ResultSerializerRaw', () => {
  let dir: string;
  let path: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'sparql-benchmark-runner-'));
    path = join(dir, 'output.json');
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  describe('constructor', () => {
    it('assigns default separators when options are omitted', () => {
      const serializer = new ResultSerializerRaw();

      // Accessing protected properties via bracket notation for testing
      expect((<any>serializer).columnSeparator).toBe(';');
      expect((<any>serializer).arraySeparator).toBe(' ');
    });

    it('assigns provided separators from options', () => {
      const serializer = new ResultSerializerRaw({
        columnSeparator: ',',
        arraySeparator: '|',
      });

      expect((<any>serializer).columnSeparator).toBe(',');
      expect((<any>serializer).arraySeparator).toBe('|');
    });
  });

  describe('serialize', () => {
    it('serializes standard results to a JSON file', async() => {
      const serializer = new ResultSerializerRaw();

      // Using type assertion to bypass full IResult interface implementation
      const mockResults = <IResult[]><unknown> [
        { name: 'benchmark1', ops: 100 },
      ];

      await serializer.serialize(path, mockResults);

      expect(readFileSync(path, 'utf-8')).toBe(JSON.stringify(
        [{ name: 'benchmark1', ops: 100, error: undefined }],
        null,
        2,
      ));
    });

    it('serializes multiple results like JSON.stringify', async() => {
      const serializer = new ResultSerializerRaw();
      const mockResults = <IResult[]><unknown> [
        { name: 'C1', id: '0', time: 5, results: 2, timestamps: [ 1, 2 ], hash: 'a' },
        { name: 'C1', id: '1', time: 0, results: 0, timestamps: [], hash: 'b' },
        { name: 'C2', id: '0', nested: { values: [[ 1 ], [ 2, 3 ]]}, text: 'line\nbreak' },
      ];

      await serializer.serialize(path, mockResults);

      expect(readFileSync(path, 'utf-8')).toBe(JSON.stringify(mockResults, null, 2));
    });

    it('serializes no results to an empty array', async() => {
      await new ResultSerializerRaw().serialize(path, []);

      expect(readFileSync(path, 'utf-8')).toBe('[]');
    });

    it('extracts error messages from Error objects', async() => {
      const serializer = new ResultSerializerRaw();

      const errorObject = new Error('Memory limit exceeded');
      const mockResults = <IResult[]><unknown> [
        { name: 'benchmark1', error: errorObject },
        { name: 'benchmark2', error: 'String error fallback' },
      ];

      await serializer.serialize(path, mockResults);

      expect(readFileSync(path, 'utf-8')).toBe(JSON.stringify(
        [
          { name: 'benchmark1', error: 'Memory limit exceeded' },
          { name: 'benchmark2', error: 'String error fallback' },
        ],
        null,
        2,
      ));
    });

    it('rejects when the file cannot be written', async() => {
      await expect(new ResultSerializerRaw().serialize(join(dir, 'missing', 'output.json'), []))
        .rejects.toThrow('ENOENT');
    });
  });

  describe('serializeChunks', () => {
    it('produces one chunk per result after the opening bracket', () => {
      const mockResults = <IResult[]><unknown> [{ name: 'a' }, { name: 'b' }, { name: 'c' }];

      const chunks = [ ...new ResultSerializerRaw().serializeChunks(mockResults) ];

      expect(chunks).toHaveLength(4);
      expect(chunks.join('')).toBe(JSON.stringify(mockResults, null, 2));
    });
  });
});
