# SPARQL Benchmark Runner

[![npm version](https://badge.fury.io/js/sparql-benchmark-runner.svg)](https://www.npmjs.com/package/sparql-benchmark-runner)
[![Docker Automated Build](https://img.shields.io/docker/automated/comunica/sparql-benchmark-runner.svg)](https://hub.docker.com/r/comunica/sparql-benchmark-runner/)

This is a simple tool to run a query set against a given SPARQL endpoint, and measure its execution time.

## Installation

```bash
$ npm install -g sparql-benchmark-runner
```

or 

```bash
$ yarn global add sparql-benchmark-runner
```

## Usage

```bash
$ sparql-benchmark-runner http://example.org/sparql watdiv-10M/ --output output.csv --replication 5 --warmup 1
```

## Docker

This tool is also available as a Docker image:

```bash
$ docker pull comunica/sparql-benchmark-runner
$ touch output.csv
$ docker run --rm -it -v $(pwd)/output.csv:/tmp/output.csv http://example.org/sparql watdiv-10M/ --output /tmp/output.csv --replication 5 --warmup 1
```

## License
This code is copyrighted by [Ghent University – imec](http://idlab.ugent.be/)
and released under the [MIT license](http://opensource.org/licenses/MIT).