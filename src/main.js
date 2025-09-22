#!/usr/bin/env node

const path = require('path');
const { spawn } = require('child_process');

function parseArgs(argv) {
  const args = {
    count: 1000000,
    seed: Date.now().toString(),
    out: 'invoices.csv',
    aggOut: 'invoices_agg.csv',
    minRows: 1000000,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--count' || a === '-n') args.count = parseInt(argv[++i], 10);
    else if (a === '--seed' || a === '-s') args.seed = argv[++i];
    else if (a === '--out' || a === '-o') args.out = argv[++i];
    else if (a === '--agg-out' || a === '-a') args.aggOut = argv[++i];
    else if (a === '--min-rows') args.minRows = parseInt(argv[++i], 10);
    else if (a === '--help' || a === '-h') args.help = true;
  }
  return args;
}

function runNode(script, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...args], {
      stdio: ['ignore', 'inherit', 'inherit'],
      cwd: options.cwd || process.cwd(),
      env: process.env,
    });
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${path.basename(script)} exited with code ${code}`));
    });
    child.on('error', reject);
  });
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    console.log('Uso: node src/main.js [-n|--count N] [-s|--seed SEED] [-o|--out FILE] [-a|--agg-out FILE] [--min-rows N]');
    console.log('Ejemplo: node src/main.js -n 1000000 -s 42 -o invoices.csv -a invoices_agg.csv --min-rows 1000000');
    process.exit(0);
  }

  const generateArgs = ['-n', String(args.count), '-o', args.out, '-s', String(args.seed)];
  const aggregateArgs = ['-i', args.out, '-o', args.aggOut, '--min-rows', String(args.minRows)];

  const genScript = path.resolve(__dirname, 'generate.js');
  const aggScript = path.resolve(__dirname, 'aggregate.js');

  console.log('Generando CSV de facturas...');
  await runNode(genScript, generateArgs);

  console.log('Agregando por año y mes...');
  await runNode(aggScript, aggregateArgs);

  console.log(`Listo. Archivos creados:\n- ${path.resolve(process.cwd(), args.out)}\n- ${path.resolve(process.cwd(), args.aggOut)}`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Error en la ejecución:', err.message);
    process.exit(1);
  });
}

module.exports = { parseArgs, runNode };
