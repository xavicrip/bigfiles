import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import genMod from '../src/generate.js';

const { mulberry32, generateRow } = genMod;

function tmpFile(name) {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'bigfiles-')), name);
}

describe('generator', () => {
  it('mulberry32 is deterministic for same seed', () => {
    const r1 = mulberry32('seed');
    const r2 = mulberry32('seed');
    const a = Array.from({ length: 5 }, () => r1());
    const b = Array.from({ length: 5 }, () => r2());
    expect(a).toEqual(b);
  });

  it('generateRow creates expected CSV format', () => {
    const rng = mulberry32('s');
    const line = generateRow(1, rng);
    const parts = line.trim().split(',');
    expect(parts.length).toBe(5);
    expect(parts[0]).toBe('1');
    expect(Number.isFinite(parseFloat(parts[3]))).toBe(true);
    expect(new Date(parts[4]).toString()).not.toBe('Invalid Date');
  });
});
