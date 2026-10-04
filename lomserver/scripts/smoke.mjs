import path from 'node:path';
import { fileURLToPath } from 'node:url';

export async function checkApplication(baseUrl, expectedRevision, request = fetch) {
  const health = await request(`${baseUrl}/api/health`, { signal: AbortSignal.timeout(5000) });
  if (!health.ok) throw new Error(`Health endpoint returned HTTP ${health.status}`);
  const metadata = await health.json();
  if (!expectedRevision || metadata.revision !== expectedRevision) throw new Error('Application revision mismatch');
  const posts = await request(`${baseUrl}/api/forum/posts?pageSize=1`, { signal: AbortSignal.timeout(5000) });
  if (!posts.ok) throw new Error(`Read-only database endpoint returned HTTP ${posts.status}`);
  const data = await posts.json();
  if (!Array.isArray(data.posts)) throw new Error('Invalid forum response contract');
  return { version: metadata.version, revision: metadata.revision };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  checkApplication(`http://127.0.0.1:${process.env.PORT || 3000}`, process.argv[2] || process.env.APP_REVISION)
    .then((metadata) => process.stdout.write(`Read-only smoke passed: ${JSON.stringify(metadata)}\n`))
    .catch((error) => {
      process.stderr.write(`${error.message}\n`);
      process.exitCode = 1;
    });
}
