FROM node:10

# Install location
ENV dir /var/www/sparql-benchmark-runner/

# Copy the engine files
COPY bin/*.js ${dir}/bin/
COPY package.json ${dir}

# Install the node module
RUN cd ${dir} && npm install --only=production

# Run base binary
WORKDIR ${dir}
ENTRYPOINT ["node", "./bin/runner.js"]

# Default command
CMD ["--help"]
