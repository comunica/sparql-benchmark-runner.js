# Changelog
All notable changes to this project will be documented in this file.

<a name="v4.0.0"></a>
## [v4.0.0](https://github.com/comunica/sparql-benchmark-runner.js/compare/v3.0.0...v4.0.0) - 2024-05-08

### BREAKING CHANGES
* [Revert result entry names to v2 for tooling compatibility](https://github.com/comunica/sparql-benchmark-runner.js/commit/76d4ea42d16a8af75be3e5d28e1b4fc1086e431a)
    * This means that breaking changes to output CSV files introduced in the previous release have been reverted, so things remain compatible with v2.

<a name="v3.0.0"></a>
## [v3.0.0](https://github.com/comunica/sparql-benchmark-runner.js/compare/v2.9.4...v3.0.0) - 2024-04-30

### BREAKING CHANGES
* [Rewrite into more modular components with additional metrics (#7)](https://github.com/comunica/sparql-benchmark-runner.js/commit/8fd9b182b57a9d3a042d5bb57fccf5943ae4b4de)

### Changed
* [Remove redundant index.ts copy step from Dockerfile](https://github.com/comunica/sparql-benchmark-runner.js/commit/a62d388d7fb7aab1d88cc2b73961d44e03d04bde)
* [Relocate index.ts to lib](https://github.com/comunica/sparql-benchmark-runner.js/commit/ba88f8a06567a437f0bbb2fcf205f0057ae1c1d3)

<a name="v2.9.4"></a>
## [v2.9.4](https://github.com/comunica/sparql-benchmark-runner.js/compare/v2.9.3...v2.9.4) - 2023-02-11

### Fixed
* [Fix isUp timeout not being applied](https://github.com/comunica/sparql-benchmark-runner.js/commit/f927bfecc5f6f74fcfb4086dde3067e47241d4d0)

<a name="v2.9.3"></a>
## [v2.9.3](https://github.com/comunica/sparql-benchmark-runner.js/compare/v2.9.2...v2.9.3) - 2023-02-09

### Fixed
* [Update fetch-sparql-endpoint to 3.2.1 with timeout fix](https://github.com/comunica/sparql-benchmark-runner.js/commit/943a47d4d31bc9b146b4c538cf5f6e8cff034e72)

<a name="v2.9.2"></a>
## [v2.9.2](https://github.com/comunica/sparql-benchmark-runner.js/compare/v2.9.1...v2.9.2) - 2023-02-06

### Fixed
* [Apply a default timeout on isUp check for slow fetchBindings](https://github.com/comunica/sparql-benchmark-runner.js/commit/6139b8396cddae05a4a9c90b31330b6d6de60f98)

<a name="v2.9.1"></a>
## [v2.9.1](https://github.com/comunica/sparql-benchmark-runner.js/compare/v2.9.0...v2.9.1) - 2023-02-06

### Fixed
* [Fix timeout being uncaught if fetchBindings is slow](https://github.com/comunica/sparql-benchmark-runner.js/commit/10b3427148fc7113955ed7a806bddffdf8375202)

<a name="v2.9.0"></a>
## [v2.9.0](https://github.com/comunica/sparql-benchmark-runner.js/compare/v2.8.2...v2.9.0) - 2023-02-06

### Added
* [Allow fallback timeout to be configured](https://github.com/comunica/sparql-benchmark-runner.js/commit/3e8caea5277193df714df2ca6dc70bcf37f09eac)

<a name="v2.8.2"></a>
## [v2.8.2](https://github.com/comunica/sparql-benchmark-runner.js/compare/v2.8.1...v2.8.2) - 2022-11-09

### Fixed
* [Include source map files in packed files](https://github.com/comunica/sparql-benchmark-runner.js/commit/14036142200fe7865f33fd2ba9c410b1aeba0022)

<a name="v2.8.1"></a>
## [v2.8.1](https://github.com/comunica/sparql-benchmark-runner.js/compare/v2.8.0...v2.8.1) - 2022-08-04

### Fixed
* [Fix metadata not being accumulated](https://github.com/comunica/sparql-benchmark-runner.js/commit/3ed192dfb5e640fe12814d5beaf0ab151594cfde)

<a name="v2.8.0"></a>
## [v2.8.0](https://github.com/comunica/sparql-benchmark-runner.js/compare/v2.7.0...v2.8.0) - 2022-08-04

### Added
* [Handle and serialize metadata from query executions](https://github.com/comunica/sparql-benchmark-runner.js/commit/370f3ed611b2389cc4869d733c1daeb91f84a805)

<a name="v2.7.0"></a>
## [v2.7.0](https://github.com/comunica/sparql-benchmark-runner.js/compare/v2.6.0...v2.7.0) - 2022-07-19

### Changed
* [Allow partial results to be stored after query error](https://github.com/comunica/sparql-benchmark-runner.js/commit/0c7197f44cc96b7c016b14ec4349bc54c967cc3a)

<a name="v2.6.0"></a>
## [v2.6.0](https://github.com/comunica/sparql-benchmark-runner.js/compare/v2.5.0...v2.6.0) - 2022-07-14

### Added
* [Allow additional URL parameters to be passed to endpoints](https://github.com/comunica/sparql-benchmark-runner.js/commit/77a578990eaa6a4e7b0c6bd8714b9a55bde4a439)

<a name="v2.5.0"></a>
## [v2.5.0](https://github.com/comunica/sparql-benchmark-runner.js/compare/v2.4.0...v2.5.0) - 2022-07-13

### Changed
* [Only print a single line when waiting for endpoint to be up](https://github.com/comunica/sparql-benchmark-runner.js/commit/25406e2689712f8a501ec4ee353e0f18728093d4)

<a name="v2.4.0"></a>
## [v2.4.0](https://github.com/comunica/sparql-benchmark-runner.js/compare/v2.3.0...v2.4.0) - 2022-06-29

### Added
* [Mark errored results in output](https://github.com/comunica/sparql-benchmark-runner.js/commit/f5f72e543060fa0610fb8fc8304e0e50d9a8f351)

<a name="v2.3.0"></a>
## [v2.3.0](https://github.com/comunica/sparql-benchmark-runner.js/compare/v2.2.1...v2.3.0) - 2022-06-22

### Added
* [Allow overriding query to check if endpoint is up](https://github.com/comunica/sparql-benchmark-runner.js/commit/29a84d9adf7c639a21d8eeedba1988e0fdb889f3)

<a name="v2.2.1"></a>
## [v2.2.1](https://github.com/comunica/sparql-benchmark-runner.js/compare/v2.2.0...v2.2.1) - 2021-08-10

### Fixed
* [Delay next query exec after error](https://github.com/comunica/sparql-benchmark-runner.js/commit/516af7c3d7c7636e3c7bdac7f7d8816ac59b452c)

<a name="v2.2.0"></a>
## [v2.2.0](https://github.com/comunica/sparql-benchmark-runner.js/compare/v2.1.0...v2.2.0) - 2021-08-02

### Added
* [Log query exec errors](https://github.com/comunica/sparql-benchmark-runner.js/commit/9d619f6a88773cac13354aed0865739f15362a21)

<a name="v2.1.0"></a>
## [v2.1.0](https://github.com/comunica/sparql-benchmark-runner.js/compare/v2.0.0...v2.1.0) - 2021-06-03

### Added
* [Add listeners for when query exec starts and stops](https://github.com/comunica/sparql-benchmark-runner.js/commit/1ccfc94cb879254a26dc73360ef0d6da739475c4)

<a name="v2.0.0"></a>
## [v2.0.0](https://github.com/comunica/sparql-benchmark-runner.js/compare/v1.0.1...v2.0.0) - 2021-05-05

### Changed
* [Rewrite in TypeScript](https://github.com/comunica/sparql-benchmark-runner.js/commit/f006723c7c915272347813e2bce7f0e637a9209a)

<a name="v1.0.0"></a>
## [v1.0.0] - 2021-04-29

Initial release
