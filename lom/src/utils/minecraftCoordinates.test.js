import { describe, expect, it } from 'vitest';
import { coordinateReport, parseBlockCoordinate, portalPositionText } from './minecraftCoordinates.js';

describe('local-only block coordinates', () => {
  it.each([
    [0, 0],
    [-0, 0],
    ['-0', 0],
    [' +16 ', 16],
    ['-30', -30],
    [30_000_000, 30_000_000],
    [-30_000_000, -30_000_000],
  ])('parses %s exactly as %s', (input, expected) => {
    expect(parseBlockCoordinate(input)).toBe(expected);
  });
  it.each([
    '',
    ' ',
    '1.5',
    '1e3',
    '0x10',
    '1,024',
    '1x',
    null,
    undefined,
    true,
    Infinity,
    NaN,
    1.5,
    30_000_001,
    -30_000_001,
  ])('rejects invalid input %s instead of truncating it', (input) => {
    expect(parseBlockCoordinate(input)).toBeNull();
    expect(coordinateReport(input, 0)).toBeNull();
  });
  it('converts both directions without rounding negative fractional coordinates', () => {
    expect(coordinateReport(-1, -16).portal).toEqual({ x: -0.125, z: -2, dimension: 'nether' });
    expect(coordinateReport(128, -256, 'nether').portal).toEqual({ x: 1024, z: -2048, dimension: 'overworld' });
    expect(coordinateReport(1, 1).portal).toEqual({ x: 0.125, z: 0.125, dimension: 'nether' });
  });
  it.each([
    [-17, -2, 15, -32, -17],
    [-16, -1, 0, -16, -1],
    [-1, -1, 15, -16, -1],
    [0, 0, 0, 0, 15],
    [15, 0, 15, 0, 15],
    [16, 1, 0, 16, 31],
  ])('places coordinate %s inside the correct chunk', (x, index, local, start, end) => {
    expect(coordinateReport(x, x).chunk.x).toEqual({ index, local, start, end });
    expect(coordinateReport(x, x).chunk.z).toEqual({ index, local, start, end });
  });
  it('reconstructs every tested positive and negative block from chunk and local position', () => {
    for (let x = -1000; x <= 1000; x++) {
      const axis = coordinateReport(x, -x).chunk.x;
      expect(axis.index * 16 + axis.local).toBe(x);
      expect(axis.local).toBeGreaterThanOrEqual(0);
      expect(axis.local).toBeLessThan(16);
      expect(x).toBeGreaterThanOrEqual(axis.start);
      expect(x).toBeLessThanOrEqual(axis.end);
    }
  });
  it('keeps the source dimension distinct and rejects unsupported dimensions', () => {
    expect(coordinateReport(16, -1, 'nether').source).toEqual({ x: 16, z: -1, dimension: 'nether' });
    expect(coordinateReport(16, 16, 'the_end')).toBeNull();
  });
  it('copies exact labeled positions, not rounded block suggestions or commands', () => {
    expect(portalPositionText(coordinateReport(-1, -16))).toBe('下界 X: -0.125, Z: -2');
    expect(portalPositionText(coordinateReport(128, -256, 'nether'))).toBe('主世界 X: 1024, Z: -2048');
    expect(portalPositionText(null)).toBe('');
  });
});
