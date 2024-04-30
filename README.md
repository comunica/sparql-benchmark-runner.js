# SPARQL Benchmark Runner

[![Build](https://github.com/comunica/sparql-benchmark-runner.js/workflows/CI/badge.svg)](https://github.com/comunica/sparql-benchmark-runner.js/actions?query=workflow%3ACI)
[![Coverage](https://coveralls.io/repos/github/comunica/sparql-benchmark-runner.js/badge.svg?branch=master)](https://coveralls.io/github/comunica/sparql-benchmark-runner.js?branch=master)
[![NPM](https://badge.fury.io/js/sparql-benchmark-runner.svg)](https://www.npmjs.com/package/sparql-benchmark-runner)
[![Docker](https://img.shields.io/docker/automated/comunica/sparql-benchmark-runner.svg)](https://hub.docker.com/r/comunica/sparql-benchmark-runner/)

This is a simple tool to run a query set against a given SPARQL endpoint, and measure its execution time.

Concretely, the query set is a directory containing any number of files,
where each file contains a number of SPARQL queries seperated by empty lines.

Example directory of a query set:
```text
watdiv-10M/
  C1.txt
  C2.txt
  C3.txt
  F1.txt
  ...
```

Example contents of `C1.txt`:
```sparql
SELECT * WHERE {
  ?v0 <http://schema.org/caption> ?v1 .
  ?v0 <http://schema.org/text> ?v2 .
}

SELECT * WHERE {
  ?v0 <http://schema.org/caption> ?v1 .
  ?v0 <http://schema.org/text> ?v2 .
}

SELECT * WHERE {
  ?v0 <http://schema.org/caption> ?v1 .
  ?v0 <http://schema.org/text> ?v2 .
}
```

By default, it generates CSV output in a form similar to:
```csv
name;id;duration;durationMax;durationMin;error;errorDescription;failures;replication;resultCount;resultCountMax;resultCountMin;resultHash;timestamps;timestampsMax;timestampsMin
C1;0;2074.5;2153;1996;false;;0;2;6;6;6;d632b8166f912f4afd062d64186f2dc6;2070 2072.5 2072.5 2072.5 2072.5 2072.5;2145 2150 2150 2150 2150 2150;1995 1995 1995 1995 1995 1995
C1;1;449.5;451;448;false;;0;2;4;4;4;e00f199d535cd1710bf9be67f04f39e4;448.5 449 449 449;450 451 451 451;447 447 447 447
C1;2;359.5;370;349;false;;0;2;1;1;1;c4499554f796e968a069e67a8f5d9d1c;357.5;367;348
C1;3;2262;2272;2252;false;;0;2;14;14;14;6c0a9fe8be642ee232c10c9996912b97;2260 2260 2260 2260.5 2260.5 2260.5 2260.5 2261 2261 2261 2261 2261 2261 2261;2271 2271 2271 2271 2271 2271 2271 2271 2271 2271 2271 2271 2271 2271;2249 2249 2249 2250 2250 2250 2250 2251 2251 2251 2251 2251 2251 2251
C1;4;1970;2032;1908;false;;0;2;8;8;8;7536d3a2c1abc2a9ac92b1860efa3282;1967 1967.5 1968.5 1968.5 1969 1969 1969 1969;2030 2031 2031 2031 2031 2031 2031 2031;1904 1904 1906 1906 1907 1907 1907 1907
```

## Installation

```bash
npm install sparql-benchmark-runner
```

## Usage

```bash
sparql-benchmark-runner \
  --endpoint http://example.org/sparql \
  --queries ./watdiv-10M/ \
  --output ./output.csv \
  --replication 5 \
  --warmup 1
```

When used as a JavaScript library, the runner can be configured with different query loaders,
result aggregators and result serializers to accommodate special use cases.

```javascript
import { SparqlBenchmarkRunner, ResultSerializerCsv, QueryLoaderFile} from 'sparql-benchmark-runner';

async function executeQueries(pathToQueries, pathToOutputCsv) {
  const loader = new QueryLoaderFile(pathToQueries);
  const querySets = await loader.loadQueries();

  const runner = new SparqlBenchmarkRunner({
    endpoint: 'https://localhost:8080/sparql',
    querySets,
    replication: 4,
    warmup: 1,
    timeout: 60_000,
    availabilityCheckTimeout: 1_000,
    logger: (message) => console.log(message),
  });

  const results = await runner.run();

  const serializer = new ResultSerializerCsv();
  await serializer.serialize(path, results);
}

```

## Docker

This tool is also available as a Docker image:

```bash
touch output.csv
docker run \
  --rm \
  --interactive \
  --tty \
  --volume $(pwd)/output.csv:/tmp/output.csv \
  --volume $(pwd)/queries:/tmp/queries \
  comunica/sparql-benchmark-runner \
  --endpoint https://dbpedia.org/sparql \
  --queries /tmp/queries \
  --output /tmp/output.csv \
  --replication 5 \
  --warmup 1
```

## License

This code is copyrighted by [Ghent University – imec](http://idlab.ugent.be/)
and released under the [MIT license](http://opensource.org/licenses/MIT).
