const minimist = require('minimist');
const fs = require('fs');
const http = require('http');
const path = require('path');
const url = require('url');

const args = minimist(process.argv.slice(2));
if ((args._.length !== 2 && args._.length !== 3) || args.h || args.help) {
  process.stderr.write('usage: sparql-benchmark-runner endpoint-url path-to-queries [replication=5]\n');
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
let replication = args._.length > 2 ? parseInt(args._[2], 10) : 5;
let filenames = fs.readdirSync(queryFolder);
for (let filename of filenames) {
  let queries = fs.readFileSync(path.join(queryFolder, filename), 'utf8').split('\n\n').filter((x) => x.length > 0);
  let name = filename.replace(/\.txt$/, '');
  watdiv[name] = queries;
  names.push(name);
}

let data = {};

run();

async function run() {
  // Execute queries
  for (let iteration = 0; iteration < replication; iteration++) {
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
