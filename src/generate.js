#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const args = { count: 1000000, out: 'invoices.csv', seed: Date.now().toString() };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--count' || a === '-n') {
      args.count = parseInt(argv[++i], 10);
    } else if (a === '--out' || a === '-o') {
      args.out = argv[++i];
    } else if (a === '--seed' || a === '-s') {
      args.seed = argv[++i];
    } else if (a === '--help' || a === '-h') {
      args.help = true;
    }
  }
  return args;
}

function mulberry32(seed) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let t = h >>> 0;
  return function() {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function randomInt(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function randomFloat(rng, min, max, decimals = 2) {
  const v = rng() * (max - min) + min;
  return parseFloat(v.toFixed(decimals));
}

function randomDate(rng, start, end) {
  const startMs = start.getTime();
  const endMs = end.getTime();
  const ts = startMs + Math.floor(rng() * (endMs - startMs));
  return new Date(ts);
}

function formatDateISO(dt) {
  return dt.toISOString();
}

function generateRow(id, rng) {
  const orderId = randomInt(rng, 1, 2000000);
  const customerId = randomInt(rng, 1, 500000);
  const total = randomFloat(rng, 1, 1000, 2);
  const date = randomDate(rng, new Date('2018-01-01T00:00:00Z'), new Date('2025-12-31T23:59:59Z'));
  return `${id},${orderId},${customerId},${total},${formatDateISO(date)}\n`;
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    console.log('Usage: node src/generate.js [-n|--count NUM] [-o|--out FILE] [--seed SEED]');
    process.exit(0);
  }
  const outputPath = path.resolve(process.cwd(), args.out);
  const rng = mulberry32(String(args.seed));

  const stream = fs.createWriteStream(outputPath, { encoding: 'utf8' });

  // header
  stream.write('id,order_id,customer_id,total,fecha\n');

  let i = 1;
  function writeMore() {
    let ok = true;
    while (ok && i <= args.count) {
      const line = generateRow(i, rng);
      ok = stream.write(line);
      i++;
    }
    if (i <= args.count) {
      stream.once('drain', writeMore);
    } else {
      stream.end();
    }
  }

  stream.on('finish', () => {
    console.log(`Generated ${args.count} rows to ${outputPath}`);
  });

  stream.on('error', (err) => {
    console.error('Write error:', err);
    process.exit(1);
  });

  writeMore();
}

if (require.main === module) {
  main();
}

module.exports = { parseArgs, mulberry32, randomInt, randomFloat, randomDate, generateRow };
