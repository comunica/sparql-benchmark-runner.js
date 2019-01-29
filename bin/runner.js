const minimist = require('minimist');
const fs = require('fs');
const http = require('http');
const path = require('path');
const url = require('url');

const args = minimist(process.argv.slice(2));
if (args._.length !== 2 || args.h || args.help) {
  process.stderr.write('usage: sparql-benchmark-runner endpoint-url path-to-queries\n');
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
let filenames = fs.readdirSync(queryFolder);
for (let filename of filenames) {
  let queries = fs.readFileSync(path.join(queryFolder, filename), 'utf8').split('\n\n').filter((x) => x.length > 0);
  let name = filename.replace(/\.txt$/, '');
  watdiv[name] = queries;
  names.push(name);
}

let loops = 4;
console.log(`name;id;results;time`);
callRecursive(0, 0);

function callRecursive(nameId, id) {
  let name = names[nameId];
  call(watdiv[name][id], (results, time) => {
    console.log(`${name};${id};${results};${time}`);
    ++id;
    if (id >= watdiv[name].length) {
      id = 0;
      ++nameId
    }
    if (nameId < names.length) {
      callRecursive(nameId, id);
    } else if (--loops > 0) {
      callRecursive(0, 0);
    }
  });
}

function call(query, done) {
  let hrstart = process.hrtime();
  let count = -2; // ignore header lines
  const req = http.request(options, res => {
    res.on('data', data => { count += data.toString().split('\n').filter(x => x.trim().length > 0).length; });
    res.on('end', () => {
      done(count, Math.floor(stop(hrstart)));
    });
  });

  req.write('query=' + query);
  req.end();
}


function stop(hrstart) {
  // execution time simulated with setTimeout function
  let hrend = process.hrtime(hrstart);
  return hrend[0]*1000 + hrend[1]/1000000;
}
