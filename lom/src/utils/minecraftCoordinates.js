export const coordinateLimit = 30_000_000;

export function parseBlockCoordinate(value) {
  if (typeof value === 'string') {
    const text = value.trim();
    if (!/^[+-]?\d+$/.test(text)) return null;
    value = Number(text);
  }
  if (!Number.isSafeInteger(value) || Math.abs(value) > coordinateLimit) return null;
  return value === 0 ? 0 : value;
}

function chunkAxis(value) {
  const index = Math.floor(value / 16);
  const start = index * 16;
  return { index: index === 0 ? 0 : index, start, end: start + 15, local: value - start };
}

// Mathematical X/Z conversion only: no world-boundary, existing-portal or server-state lookup.
export function coordinateReport(xInput, zInput, dimension = 'overworld') {
  const x = parseBlockCoordinate(xInput),
    z = parseBlockCoordinate(zInput);
  if (x == null || z == null || !['overworld', 'nether'].includes(dimension)) return null;
  const scale = dimension === 'overworld' ? 1 / 8 : 8;
  return {
    source: { x, z, dimension },
    portal: { x: x * scale, z: z * scale, dimension: dimension === 'overworld' ? 'nether' : 'overworld' },
    chunk: { x: chunkAxis(x), z: chunkAxis(z) },
  };
}

export function portalPositionText(report) {
  if (!report) return '';
  const { x, z, dimension } = report.portal;
  return `${dimension === 'nether' ? '下界' : '主世界'} X: ${x}, Z: ${z}`;
}
