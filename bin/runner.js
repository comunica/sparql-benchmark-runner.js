const minimist = require('minimist');
const fs = require('fs');
const http = require('http');
const path = require('path');
const url = require('url');

const args = minimist(process.argv.slice(2));
if (args._.length !== 2 || args.h || args.help) {
  process.stderr.write('usage: sparql-benchmark-runner endpoint-url path-to-queries [--replication 5] [--warmup 0]\n');
  process.exit(1);
}

const options = {
  ...url.parse(args._[0]),
  method: 'POST',
  headers: {
    'Accept': 'table',
    'Content-Type': 'application/x-www-form-urlencoded',
  }
};

let watdiv = {};
let names = [];
let queryFolder = args._[1];
let replication = args.r || 5;
let warmup = args.w || 0;
let filenames = fs.readdirSync(queryFolder);
for (let filename of filenames) {
  let queries = fs.readFileSync(path.join(queryFolder, filename), 'utf8').split('\n\n').filter((x) => x.length > 0);
  let name = filename.replace(/\.txt$/, '');
  watdiv[name] = queries;
  names.push(name);
}

run();

async function run() {
  // Await query execution until the endpoint is live
  while (!await isUp()) {
    await sleep(1000);
  }

  // Execute queries in warmup
  await execute({}, warmup);

  // Execute queries
  const data = {};
  await execute(data, replication);

  // Average results
  for (const key in data) {
    data[key].time = Math.floor(data[key].time / replication);
  }

  // Print results
  console.log(`name;id;results;time`);
  for (const key in data) {
    const { name, id, count, time } = data[key];
    console.log(`${name};${id};${count};${time}`);
  }
}

async function execute(data, iterations) {
  for (let iteration = 0; iteration < iterations; iteration++) {
    for (const name in watdiv) {
      const test = watdiv[name];
      for (const id in test) {
        const query = test[id];
        const { count, time } = await call(query);
        if (!data[name + id]) {
          data[name + id] = { name, id, count, time };
        } else {
          data[name + id].time += time;
        }
      }
    }
  }
}

function call(query) {
  return new Promise((resolve, reject) => {
    let hrstart = process.hrtime();
    let count = -2; // ignore header lines
    const req = http.request(options, res => {
      res.on('data', data => { count += data.toString().split('\n').filter(x => x.trim().length > 0).length; });
      res.on('end', () => {
        resolve({ count, time: stop(hrstart) });
      });
      res.on('error', reject);
    });

    req.write('query=' + query);
    req.end();
  });
}


function stop(hrstart) {
  // execution time simulated with setTimeout function
  let hrend = process.hrtime(hrstart);
  return hrend[0] * 1000 + hrend[1] / 1000000;
}

async function isUp() {
  return new Promise((resolve) => {
    const req = http.request(options, res => {
      res.on('error', () => resolve(false));
      res.on('data', () => {});
      res.on('end', () => resolve(true));
    });

    req.on('error', () => resolve(false));
    req.write('query=ASK WHERE { ?s ?p ?o }');
    req.end();
  });
}

async function sleep(durationMs) {
  return new Promise((resolve) => {
      setTimeout(resolve, durationMs);
  });
}
