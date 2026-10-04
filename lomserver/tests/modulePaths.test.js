import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const workspace = path.dirname(root.replace(/[\\/]$/, ''));
const gitFiles = existsSync(path.join(workspace, '.git'))
  ? execFileSync('git', ['ls-files', '-z', 'lomserver'], { cwd: workspace, encoding: 'utf8' }).split('\0')
  : [];
const trackedNames = new Map(gitFiles.filter(Boolean).map((filename) => [filename.toLowerCase(), filename]));
function assertGitCasing(filename) {
  const relative = path.relative(workspace, filename).split(path.sep).join('/');
  const tracked = trackedNames.get(relative.toLowerCase());
  if (tracked) expect(relative, `Git tracks this path as ${tracked}`).toBe(tracked);
}
function sources(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (['node_modules', 'upload', 'logs', 'public', 'tests'].includes(entry.name)) return [];
    const filename = path.join(directory, entry.name);
    return entry.isDirectory() ? sources(filename) : /\.(m?js)$/.test(entry.name) ? [filename] : [];
  });
}
describe('Linux-compatible source imports', () => {
  for (const filename of sources(root)) {
    it(path.relative(root, filename), () => {
      assertGitCasing(filename);
      const imports = readFileSync(filename, 'utf8').matchAll(/from\s+['"](\.[^'"]+)['"]/g);
      for (const [, relative] of imports) {
        const resolved = path.resolve(path.dirname(filename), relative);
        assertGitCasing(resolved);
        expect(readdirSync(path.dirname(resolved)), `${filename} imports ${relative}`).toContain(
          path.basename(resolved),
        );
      }
    });
  }
});
