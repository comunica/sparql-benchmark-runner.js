# Build stage
FROM node:lts AS build

## Enable yarn, which is no longer bundled with Node.js
RUN npm install -g corepack && corepack enable

## Set current working directory
WORKDIR /sparql-benchmark-runner

## Copy all files
COPY bin/ ./bin/
COPY lib/ ./lib/
COPY package.json .
COPY tsconfig.json .
COPY yarn.lock .

## Install and build the lib
RUN yarn install --frozen-lockfile --ignore-scripts && yarn run build


# Runtime stage
FROM node:lts-alpine

## Enable yarn, which is no longer bundled with Node.js
RUN npm install -g corepack && corepack enable

## Set current working directory
WORKDIR /sparql-benchmark-runner

## Copy runtime files from build stage
COPY --from=build /sparql-benchmark-runner/yarn.lock .
COPY --from=build /sparql-benchmark-runner/package.json .
COPY --from=build /sparql-benchmark-runner/bin ./bin
COPY --from=build /sparql-benchmark-runner/lib ./lib

# Install the node module
RUN yarn install --frozen-lockfile --production --ignore-scripts

# Run base binary
ENTRYPOINT ["node", "./bin/sparql-benchmark-runner"]

# Default command
CMD ["--help"]
