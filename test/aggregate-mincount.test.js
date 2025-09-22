import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import aggMod from '../src/aggregate.js';

const { aggregateFile } = aggMod;

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'bigfiles-'));
}

describe('aggregator min-rows validation', () => {
  it('rejects when processed rows <= minRows', async () => {
    const dir = tmpDir();
    const input = path.join(dir, 'invoices.csv');
    const output = path.join(dir, 'agg.csv');
    const csv = [
      'id,order_id,customer_id,total,fecha',
      '1,10,100,10.00,2023-01-15T12:00:00.000Z',
      '2,11,101,20.00,2023-01-20T12:00:00.000Z',
    ].join('\n') + '\n';
    fs.writeFileSync(input, csv, 'utf8');

    await expect(aggregateFile(input, output, { minRows: 3 })).rejects.toThrow(/más de 3/);
  });
});
