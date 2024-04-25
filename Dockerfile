# Build stage
FROM node:lts AS build

## Set current working directory
WORKDIR /sparql-benchmark-runner

## Copy all files
COPY bin/ ./bin/
COPY lib/ ./lib/
COPY package.json .
COPY tsconfig.json .
COPY yarn.lock .

## Install and build the lib
RUN yarn install --frozen-lockfile


# Runtime stage
FROM node:lts-alpine

## Set current working directory
WORKDIR /sparql-benchmark-runner

## Copy runtime files from build stage
COPY --from=build /sparql-benchmark-runner/yarn.lock .
COPY --from=build /sparql-benchmark-runner/package.json .
COPY --from=build /sparql-benchmark-runner/bin ./bin
COPY --from=build /sparql-benchmark-runner/lib ./lib

# Install the node module
RUN yarn install --frozen-lockfile --production

# Run base binary
ENTRYPOINT ["node", "./bin/sparql-benchmark-runner"]

# Default command
CMD ["--help"]
