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
name;id;results;time;timestamps
C1;0;15;5784;1301 2136 2136 2137 3981 4432 4432 4432 4433 4511 4941 4941 4941 5031 5032
C1;1;15;4332;833 1607 1607 1608 2617 3026 3026 3026 3027 3096 3564 3564 3564 3643 3644
C1;2;15;4623;1088 1900 1900 1901 2847 3298 3298 3298 3299 3376 3796 3796 3796 3883 3883
```

## Installation

```bash
npm install sparql-benchmark-runner
```

## Usage

```bash
sparql-benchmark-runner \
  --endpoint http://example.org/sparql \
  --queries watdiv-10M/ \
  --output output.csv \
  --replication 5 \
  --warmup 1
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
