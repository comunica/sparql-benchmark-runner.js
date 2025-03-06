import type * as fs from 'node:fs';
import type { IResult } from '../lib/Result';
import { ResultSerializerCsv } from '../lib/ResultSerializerCsv';

const writeStreamEnd = jest.fn();
const writeStreamWrite = jest.fn();

jest.mock<typeof fs>('node:fs', () => <typeof fs> <unknown> ({
  createWriteStream: (): fs.WriteStream => <fs.WriteStream> <unknown> ({
    write: writeStreamWrite,
    end: writeStreamEnd,
  }),
}));

describe('ResultSerializerCsv', () => {
  let resultSerializer: ResultSerializerCsv;
  let results: IResult[];

  beforeEach(() => {
    jest.resetAllMocks();
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
    ];
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
      'timestampsAll',
      'undefinedValue',
    ]);
  });

  it('should properly serialize results', async() => {
    const expectedLines = [
      // eslint-disable-next-line max-len
      'name;id;bigintValue;error;errorDescription;functionValue;hash;objectValue;results;symbolValue;symbolWithoutValue;time;timestamps;timestampsAll;undefinedValue\n',
      'a;0;1;false;;functionValue;hash;;0;;;0;;;\n',
      'a;1;;false;;;result;;1;Example symbol;;1;1;"[[1]]";\n',
      'a;2;;true;Example error;;error;ReadableStream;0;;;0;;;\n',
    ];
    await resultSerializer.serialize('results.csv', results);
    for (const [ index, line ] of expectedLines.entries()) {
      expect(writeStreamWrite).toHaveBeenNthCalledWith(index + 1, line);
    }
    expect(writeStreamEnd).toHaveBeenCalledTimes(1);
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
    ];
    await resultSerializer.serialize('results.csv', results);
    for (const [ index, line ] of expectedLines.entries()) {
      expect(writeStreamWrite).toHaveBeenNthCalledWith(index + 1, line);
    }
    expect(writeStreamEnd).toHaveBeenCalledTimes(1);
  });
});
