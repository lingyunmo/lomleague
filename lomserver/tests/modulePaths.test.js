import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
function sources(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (['node_modules', 'upload', 'logs', 'public', 'tests'].includes(entry.name)) return [];
    const filename = path.join(directory, entry.name);
    return entry.isDirectory() ? sources(filename) : entry.name.endsWith('.js') ? [filename] : [];
  });
}
describe('Linux-compatible source imports', () => {
  for (const filename of sources(root)) {
    it(path.relative(root, filename), () => {
      const imports = readFileSync(filename, 'utf8').matchAll(/from\s+['"](\.[^'"]+)['"]/g);
      for (const [, relative] of imports) {
        const resolved = path.resolve(path.dirname(filename), relative);
        expect(readdirSync(path.dirname(resolved)), `${filename} imports ${relative}`).toContain(
          path.basename(resolved),
        );
      }
    });
  }
});
