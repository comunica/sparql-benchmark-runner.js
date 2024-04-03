# Build stage
FROM node:lts

## Set current working directory
WORKDIR /sparql-benchmark-runner

## Copy all files
COPY bin/ ./bin/
COPY lib/ ./lib/
COPY package.json .
COPY tsconfig.json .
COPY .yarnrc.yml .
COPY yarn.lock .

## Install and build the lib
RUN corepack enable && yarn install --immutable && yarn build

# Run base binary
ENTRYPOINT ["node", "./bin/sparql-benchmark-runner.js"]

# Default command
CMD ["--help"]
