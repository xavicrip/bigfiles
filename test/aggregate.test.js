import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import aggMod from '../src/aggregate.js';

const { aggregateFile } = aggMod;

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'bigfiles-'));
}

function writeFile(filePath, content) {
  fs.writeFileSync(filePath, content, 'utf8');
}

describe('aggregator', () => {
  it('aggregates by year and month with correct stats', async () => {
    const dir = tmpDir();
    const input = path.join(dir, 'invoices.csv');
    const output = path.join(dir, 'agg.csv');
    const csv = [
      'id,order_id,customer_id,total,fecha',
      '1,10,100,10.00,2023-01-15T12:00:00.000Z',
      '2,11,101,20.00,2023-01-20T12:00:00.000Z',
      '3,12,102,30.00,2023-02-05T12:00:00.000Z',
      '4,13,103,40.00,2024-01-01T00:00:00.000Z',
    ].join('\n') + '\n';
    writeFile(input, csv);

    await aggregateFile(input, output, { minRows: 0 });

    const out = fs.readFileSync(output, 'utf8').trim().split('\n');
    expect(out[0]).toBe('year,month,num_sales,max,min,mean,stddev');
    // Sorted keys: 2023-01, 2023-02, 2024-01
    const row1 = out[1].split(',');
    expect(row1[0]).toBe('2023');
    expect(row1[1]).toBe('01');
    expect(row1[2]).toBe('2');
    expect(row1[3]).toBe('20.00'); // max
    expect(row1[4]).toBe('10.00'); // min
    expect(parseFloat(row1[5])).toBeCloseTo(15.0, 4); // mean
    expect(parseFloat(row1[6])).toBeCloseTo(7.0711, 3); // stddev

    const row2 = out[2].split(',');
    expect(row2[0]).toBe('2023');
    expect(row2[1]).toBe('02');
    expect(row2[2]).toBe('1');
    expect(row2[3]).toBe('30.00');
    expect(row2[4]).toBe('30.00');
    expect(parseFloat(row2[5])).toBeCloseTo(30.0, 4);
    expect(parseFloat(row2[6])).toBeCloseTo(0.0, 4);

    const row3 = out[3].split(',');
    expect(row3[0]).toBe('2024');
    expect(row3[1]).toBe('01');
    expect(row3[2]).toBe('1');
    expect(row3[3]).toBe('40.00');
    expect(row3[4]).toBe('40.00');
    expect(parseFloat(row3[5])).toBeCloseTo(40.0, 4);
    expect(parseFloat(row3[6])).toBeCloseTo(0.0, 4);
  });
});
