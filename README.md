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
name;id;error;errorDescription;failures;hash;replication;results;resultsMax;resultsMin;time;timeMax;timeMin;times;timestamps;timestampsMax;timestampsMin;timestampsStd;timeStd
C1;0;false;;0;6e0f167d2eb0e61af0673275ee8f935f;5;5;5;5;25.8;33;20;28 33 26 22 20;25.4 25.4 25.4 25.4 25.4;32 32 32 32 32;20 20 20 20 20;4.176122603564219 4.176122603564219 4.176122603564219 4.176122603564219 4.176122603564219;4.578209256903839
C1;1;false;;0;3e279701df97583c2f296ac0c2e5b877;5;5;5;5;38.6;90;20;27 28 28 20 90;38.4 38.4 38.6 38.6 38.6;89 89 90 90 90;20 20 20 20 20;25.476263462289754 25.476263462289754 25.873538606073968 25.873538606073968 25.873538606073968;25.873538606073968
C1;2;false;;0;4783aeaa4ce9950eafd3a623e1a537f6;5;5;5;5;35.8;80;20;28 26 80 20 25;35.8 35.8 35.8 35.8 35.8;80 80 80 80 80;20 20 20 20 20;22.25668438918969 22.25668438918969 22.25668438918969 22.25668438918969 22.25668438918969;22.25668438918969
```

## Installation

```bash
npm install sparql-benchmark-runner
```

## Usage
`sparql-benchmark-runner` can be used from the CLI with the the following options.

```
Options:
  --version      Show version number                                   [boolean]
  --endpoint     URL of the SPARQL endpoint to send queries to
                                                             [string] [required]
  --queries      Directory of the queries                    [string] [required]
  --replication  Number of replication runs                [number] [default: 5]
  --warmup       Number of warmup runs                     [number] [default: 1]
  --output       Destination for the output CSV file
                                              [string] [default: "./output.csv"]
  --timeout      Timeout value in seconds to use for individual queries [number]
  ----help
```
An example input is the following.

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

  const querySets = await queryLoader.loadQueries();

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
  --volume $(pwd)/output.csv:/output.csv \
  --volume $(pwd)/queries:/queries \
  comunica/sparql-benchmark-runner \
  --endpoint https://dbpedia.org/sparql \
  --queries /queries \
  --output /output.csv \
  --replication 5 \
  --warmup 1
```

## License

This code is copyrighted by [Ghent University – imec](http://idlab.ugent.be/)
and released under the [MIT license](http://opensource.org/licenses/MIT).
