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
name;id;error;errorDescription;failures;hash;replication;results;resultsMax;resultsMin;time;timeAggregate;timeMax;timeMin;timestamps;timestampsMax;timestampsMin;timestampsStd;timeStd
C1;0;false;;0;6e0f167d2eb0e61af0673275ee8f935f;5;5;5;5;17.2;18 17 17 16 18;18;16;16.8 17 17 17 17;18 18 18 18 18;16 16 16 16 16;0.7483314773547882 0.6324555320336759 0.6324555320336759 0.6324555320336759 0.6324555320336759;0.7483314773547882
C1;1;false;;0;3e279701df97583c2f296ac0c2e5b877;5;5;5;5;17.4;18 17 17 17 18;18;17;17.2 17.2 17.4 17.4 17.4;18 18 18 18 18;16 16 17 17 17;0.7483314773547882 0.7483314773547882 0.4898979485566356 0.4898979485566356 0.4898979485566356;0.4898979485566356
C1;2;false;;0;4783aeaa4ce9950eafd3a623e1a537f6;5;5;5;5;17.6;19 17 16 20 16;20;16;17.6 17.6 17.6 17.6 17.6;20 20 20 20 20;16 16 16 16 16;1.624807680927192 1.624807680927192 1.624807680927192 1.624807680927192 1.624807680927192;1.624807680927192
```
but without the `timeAggregate` field.
`timeAggregate` is the execution time of every iteration of a query.
It is enabled by the flag `outputIterationResults` as documented below.

## Installation

```bash
npm install sparql-benchmark-runner
```

## Usage
`sparql-benchmark-runner` can be used as a CLI programming with the the following options.

```
Options:
  --version                 Show version number                        [boolean]
  --endpoint                URL of the SPARQL endpoint to send queries to
                                                             [string] [required]
  --queries                 Directory of the queries         [string] [required]
  --replication             Number of replication runs     [number] [default: 5]
  --warmup                  Number of warmup runs          [number] [default: 1]
  --output                  Destination for the output CSV file
                                              [string] [default: "./output.csv"]
  --timeout                 Timeout value in seconds to use for individual
                            queries                                     [number]
  --outputIterationResults  A flag indicating if iteration results should be
                            produced                  [boolean] [default: false]
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
    outputIterationResults: false // false by default, if true will add the iteration results (timeAggregate field) to the aggregated results
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
