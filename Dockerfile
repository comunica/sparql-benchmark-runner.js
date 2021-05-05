# Build stage
FROM node:lts AS build

## Set current working directory
WORKDIR /sparql-benchmark-runner

## Copy all files
COPY bin/ ./bin/
COPY lib/ ./lib/
COPY index.ts .
COPY package.json .
COPY tsconfig.json .

## Install and build the lib
RUN npm install


# Runtime stage
FROM node:lts-alpine

## Set current working directory
WORKDIR /sparql-benchmark-runner

## Copy runtime files from build stage
COPY --from=build /sparql-benchmark-runner/package.json .
COPY --from=build /sparql-benchmark-runner/bin ./bin
COPY --from=build /sparql-benchmark-runner/lib ./lib

# Install the node module
RUN npm install --only=production

# Run base binary
ENTRYPOINT ["node", "./bin/sparql-benchmark-runner"]

# Default command
CMD ["--help"]
