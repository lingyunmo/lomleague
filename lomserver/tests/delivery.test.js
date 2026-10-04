import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url));

describe('non-destructive delivery invariants', () => {
  it('has a single authoritative workspace and lockfile', () => {
    expect(existsSync(`${root}pnpm-lock.yaml`)).toBe(true);
    expect(existsSync(`${root}pnpm-workspace.yaml`)).toBe(true);
    for (const directory of ['lom', 'lomserver']) {
      expect(existsSync(`${root}${directory}/pnpm-lock.yaml`)).toBe(false);
      expect(existsSync(`${root}${directory}/pnpm-workspace.yaml`)).toBe(false);
      expect(existsSync(`${root}${directory}/.npmrc`)).toBe(false);
    }
  });
  it('starts the production application without schema mutation or implicit installation', () => {
    const dockerfile = readFileSync(`${root}Dockerfile`, 'utf8');
    const command = dockerfile.split('\n').find((line) => line.startsWith('CMD '));
    expect(command).toBe('CMD ["node", "index.js"]');
    expect(dockerfile).toContain('/app/pnpm-lock.yaml /app/.npmrc');
    const workspace = readFileSync(`${root}pnpm-workspace.yaml`, 'utf8');
    expect(workspace).toContain('verifyDepsBeforeRun: error');
    expect(workspace).not.toContain('onlyBuiltDependencies');
  });
  it('uses separately provisioned database credentials and serializes lom maintenance', () => {
    const compose = readFileSync(`${root}docker-compose.prod.yml`, 'utf8');
    const workflow = readFileSync(`${root}.github/workflows/deploy.yml`, 'utf8');
    expect(compose).toContain('.ops-secrets/runtime.env');
    expect(compose).not.toContain('mysql://root:');
    expect(workflow).toContain('flock -w 120 9');
    expect(workflow).toContain('source: docker-compose.prod.yml,ops');
    expect(workflow).toContain('target: /root/minecraft/lomleague/.deploy-${{ github.run_id }}');
    expect(workflow.indexOf('cp "$staging_directory/docker-compose.prod.yml"')).toBeGreaterThan(
      workflow.indexOf('flock -w 120 9'),
    );
    expect(workflow).toContain('docker stop --time 12 lom-ci-smoke');
  });
});
