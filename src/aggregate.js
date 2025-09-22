#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

function parseArgs(argv) {
  const args = { in: 'invoices.csv', out: 'invoices_agg.csv', minRows: 1000000 };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--in' || a === '-i') {
      args.in = argv[++i];
    } else if (a === '--out' || a === '-o') {
      args.out = argv[++i];
    } else if (a === '--min-rows') {
      args.minRows = parseInt(argv[++i], 10);
    } else if (a === '--help' || a === '-h') {
      args.help = true;
    }
  }
  return args;
}

function updateStats(stats, amount) {
  stats.count += 1;
  stats.sum += amount;
  if (amount > stats.max) stats.max = amount;
  if (amount < stats.min) stats.min = amount;
  const delta = amount - stats.mean;
  stats.mean += delta / stats.count;
  const delta2 = amount - stats.mean;
  stats.m2 += delta * delta2;
}

function finalizeStats(stats) {
  const variance = stats.count > 1 ? stats.m2 / (stats.count - 1) : 0;
  const stddev = Math.sqrt(variance);
  return {
    count: stats.count,
    max: stats.max,
    min: stats.min,
    mean: stats.mean,
    stddev,
  };
}

async function aggregateFile(inputPath, outputPath, options = {}) {
  const minRows = options.minRows ?? 1000000;
  const inStream = fs.createReadStream(inputPath, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: inStream, crlfDelay: Infinity });

  const groups = new Map();
  let isHeader = true;
  let processedRows = 0;

  for await (const line of rl) {
    if (!line) continue;
    if (isHeader) {
      isHeader = false;
      continue;
    }
    const parts = line.split(',');
    if (parts.length < 5) continue;
    const totalStr = parts[3];
    const dateStr = parts[4];
    const amount = parseFloat(totalStr);
    if (!isFinite(amount)) continue;

    const d = new Date(dateStr);
    if (isNaN(d.getTime())) continue;
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const key = `${year}-${month}`;

    let s = groups.get(key);
    if (!s) {
      s = { count: 0, sum: 0, max: -Infinity, min: Infinity, mean: 0, m2: 0 };
      groups.set(key, s);
    }
    updateStats(s, amount);
    processedRows++;
  }

  if (processedRows <= minRows) {
    throw new Error(`El fichero de entrada debe tener más de ${minRows} registros de datos. Actual: ${processedRows}`);
  }

  const outStream = fs.createWriteStream(outputPath, { encoding: 'utf8' });
  outStream.write('year,month,num_sales,max,min,mean,stddev\n');

  const keys = Array.from(groups.keys()).sort();
  for (const key of keys) {
    const [yearStr, monthStr] = key.split('-');
    const finalized = finalizeStats(groups.get(key));
    const line = [
      yearStr,
      monthStr,
      finalized.count,
      finalized.max.toFixed(2),
      finalized.min.toFixed(2),
      finalized.mean.toFixed(4),
      finalized.stddev.toFixed(4),
    ].join(',') + '\n';
    if (!outStream.write(line)) {
      await new Promise((res) => outStream.once('drain', res));
    }
  }
  await new Promise((res, rej) => {
    outStream.end(() => res());
    outStream.on('error', rej);
  });
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    console.log('Usage: node src/aggregate.js [-i|--in FILE] [-o|--out FILE] [--min-rows N]');
    process.exit(0);
  }
  const inputPath = path.resolve(process.cwd(), args.in);
  const outputPath = path.resolve(process.cwd(), args.out);

  try {
    await aggregateFile(inputPath, outputPath, { minRows: args.minRows });
    console.log(`Aggregated file written to ${outputPath}`);
  } catch (err) {
    console.error('Aggregation error:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { parseArgs, aggregateFile, updateStats, finalizeStats };
