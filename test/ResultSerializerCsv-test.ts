import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { IResult } from '../lib/Result';
import { ResultSerializerCsv } from '../lib/ResultSerializerCsv';

describe('ResultSerializerCsv', () => {
  let resultSerializer: ResultSerializerCsv;
  let results: IResult[];
  let dir: string;
  let path: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'sparql-benchmark-runner-'));
    path = join(dir, 'results.csv');
    resultSerializer = new ResultSerializerCsv();
    results = [
      {
        name: 'a',
        id: '0',
        time: 0,
        results: 0,
        hash: 'hash',
        timestamps: [],
        functionValue: () => {},
        bigintValue: BigInt(1),
      },
      {
        name: 'a',
        id: '1',
        time: 1,
        results: 1,
        hash: 'result',
        timestamps: [ 1 ],
        timestampsAll: [[ 1 ]],
        symbolValue: Symbol('Example symbol'),
        // eslint-disable-next-line symbol-description
        symbolWithoutValue: Symbol(),
        undefinedValue: undefined,
      },
      {
        name: 'a',
        id: '2',
        time: 0,
        error: new Error('Example error'),
        results: 0,
        hash: 'error',
        timestamps: [],
        objectValue: new ReadableStream(),
      },
      {
        name: 'a',
        id: '2',
        time: 0,
        error: new Error('Example error\nWith newline'),
        results: 0,
        hash: 'error',
        timestamps: [],
        objectValue: new ReadableStream(),
      },
    ];
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('should properly sort keys', async() => {
    await expect(resultSerializer.keys(results)).resolves.toStrictEqual([
      'name',
      'id',
      'bigintValue',
      'error',
      'errorDescription',
      'functionValue',
      'hash',
      'objectValue',
      'results',
      'symbolValue',
      'symbolWithoutValue',
      'time',
      'timestamps',
      'undefinedValue',
      'timestampsAll',
    ]);
  });

  it('should properly serialize results', async() => {
    const expectedLines = [
      // eslint-disable-next-line max-len
      'name;id;bigintValue;error;errorDescription;functionValue;hash;objectValue;results;symbolValue;symbolWithoutValue;time;timestamps;undefinedValue;timestampsAll\n',
      'a;0;1;false;;functionValue;hash;;0;;;0;;;\n',
      'a;1;;false;;;result;;1;Example symbol;;1;1;;"[[1]]"\n',
      'a;2;;true;Example error;;error;ReadableStream;0;;;0;;;\n',
      'a;2;;true;Example error\\nWith newline;;error;ReadableStream;0;;;0;;;\n',
    ];
    await resultSerializer.serialize(path, results);
    expect(readFileSync(path, 'utf-8')).toBe(expectedLines.join(''));
  });

  it('should escape all newlines, separators and quotes in errors and strings', async() => {
    results = [
      {
        name: 'a;b',
        id: '0',
        time: 0,
        error: new Error('HTTP 502:\n<html>\r\n<div style="font-weight: bold; font-size:18px">\nDown</div>\n</html>'),
        results: 0,
        hash: 'error',
        timestamps: [],
      },
    ];
    const expectedLines = [
      'name;id;error;errorDescription;hash;results;time;timestamps;timestampsAll\n',
      // eslint-disable-next-line max-len
      '"a;b";0;true;"HTTP 502:\\n<html>\\n<div style=""font-weight: bold; font-size:18px"">\\nDown</div>\\n</html>";error;0;0;;\n',
    ];
    await resultSerializer.serialize(path, results);
    expect(readFileSync(path, 'utf-8')).toBe(expectedLines.join(''));
  });

  it('should properly serialize results without ignored keys', async() => {
    resultSerializer = new ResultSerializerCsv({
      arraySeparator: ' ',
      columnSeparator: ';',
      ignoreKeys: [
        'time',
        'bigintValue',
        'hash',
        'objectValue',
        'functionValue',
        'symbolValue',
        'symbolWithoutValue',
        'undefinedValue',
        'errorWithoutMessage',
      ],
    });
    const expectedLines = [
      'name;id;error;errorDescription;results;timestamps;timestampsAll\n',
      'a;0;false;;0;;\n',
      'a;1;false;;1;1;"[[1]]"\n',
      'a;2;true;Example error;0;;\n',
      'a;2;true;Example error\\nWith newline;0;;\n',
    ];
    await resultSerializer.serialize(path, results);
    expect(readFileSync(path, 'utf-8')).toBe(expectedLines.join(''));
  });

  it('should reject when the file cannot be written', async() => {
    await expect(resultSerializer.serialize(join(dir, 'missing', 'results.csv'), results))
      .rejects.toThrow('ENOENT');
  });
});
