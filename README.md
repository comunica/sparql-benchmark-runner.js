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
name;id;error;errorDescription;failures;hash;httpRequests;httpRequestsMax;httpRequestsMin;replication;results;resultsMax;resultsMin;time;timeMax;timeMin;timestamps;timestampsMax;timestampsMin
C-1;0;false;;0;d632b8166f912f4afd062d64186f2dc6;1766.5;2271;1262;2;6;6;6;1364;1398;1330;1363.5 1363.5 1363.5 1364 1364 1364;1398 1398 1398 1398 1398 1398;1329 1329 1329 1330 1330 1330
C-1;1;false;;0;e00f199d535cd1710bf9be67f04f39e4;1803.5;2308;1299;2;4;4;4;212;214;210;211.5 212 212 212;213 214 214 214;210 210 210 210
C-1;2;false;;0;c4499554f796e968a069e67a8f5d9d1c;1834.5;2339;1330;2;1;1;1;175.5;176;175;175.5;176;175
C-1;3;false;;0;6c0a9fe8be642ee232c10c9996912b97;2279.5;2784;1775;2;14;14;14;1747;1796;1698;1746 1746 1746 1746 1746 1746 1746.5 1746.5 1746.5 1746.5 1747 1747 1747 1747;1795 1795 1795 1795 1795 1795 1795 1795 1795 1795 1796 1796 1796 1796;1697 1697 1697 1697 1697 1697 1698 1698 1698 1698 1698 1698 1698 1698
C-1;4;false;;0;7536d3a2c1abc2a9ac92b1860efa3282;2522.5;3027;2018;2;8;8;8;1360;1373;1347;1355.5 1355.5 1355.5 1355.5 1359 1359 1359 1359;1372 1372 1372 1372 1372 1372 1372 1372;1339 1339 1339 1339 1346 1346 1346 1346
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
By default, when no specific result aggregator is provided,
the runner uses `ResultAggregatorComunica` that handles basic aggregation,
as well as the `httpRequests` metadata field from a Comunica SPARQL endpoint, if such metadata is provided.

```javascript
import {
  SparqlBenchmarkRunner,
  ResultSerializerCsv,
  ResultAggregatorComunica,
  QueryLoaderFile,
} from 'sparql-benchmark-runner';

async function executeQueries(pathToQueries, pathToOutputCsv) {
  const queryLoader = new QueryLoaderFile(pathToQueries);
  const resultSerializer = new ResultSerializerCsv();
  const resultAggregator = new ResultAggregatorComunica();

  const querySets = await loader.loadQueries();

  const runner = new SparqlBenchmarkRunner({
    endpoint: 'https://localhost:8080/sparql',
    querySets,
    replication: 4,
    warmup: 1,
    timeout: 60_000,
    availabilityCheckTimeout: 1_000,
    logger: (message) => console.log(message),
    resultAggregator,
  });

  const results = await runner.run();

  await resultSerializer.serialize(path, results);
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
