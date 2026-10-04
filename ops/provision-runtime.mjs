import { randomBytes } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire('/app/lomserver/package.json');
const { PrismaClient } = require('@prisma/client');
const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);
const connection = new URL(Buffer.concat(chunks).toString('utf8').trim());
if (
  connection.hostname !== 'mysql' ||
  connection.pathname !== '/lom' ||
  decodeURIComponent(connection.username) !== 'root'
)
  throw new Error('Provisioning requires the existing lom-only administrative connection');
await mkdir('/secrets', { recursive: true, mode: 0o700 });
const administrativeConfig = `[client]\nuser=root\npassword="${decodeURIComponent(connection.password).replaceAll('\\', '\\\\').replaceAll('"', '\\"').replaceAll('\n', '\\n')}"\nhost=127.0.0.1\n`;
try {
  await writeFile('/secrets/mysql-admin.cnf', administrativeConfig, { flag: 'wx', mode: 0o600 });
} catch (error) {
  if (error.code !== 'EEXIST') throw error;
}
if (process.argv[2] === 'bootstrap') {
  process.stdout.write('Protected lom administrative backup credentials initialized\n');
} else if (process.argv[2] === 'provision') {
  const prisma = new PrismaClient({ datasourceUrl: connection.toString() });
  try {
    let runtimeUrl;
    try {
      const existing = await readFile('/secrets/runtime.env', 'utf8');
      runtimeUrl = new URL(existing.trim().replace(/^DATABASE_URL=/, ''));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      runtimeUrl = new URL(connection);
      runtimeUrl.username = 'lom_runtime';
      runtimeUrl.password = randomBytes(32).toString('hex');
      const accounts = await prisma.$queryRawUnsafe(
        "SELECT User FROM mysql.user WHERE User='lom_runtime' AND Host='%'",
      );
      if (accounts.length)
        throw new Error('An unowned lom_runtime account already exists; refusing to modify it', { cause: error });
      await writeFile('/secrets/runtime.env', `DATABASE_URL=${runtimeUrl}\n`, { flag: 'wx', mode: 0o600 });
    }
    if (
      runtimeUrl.username !== 'lom_runtime' ||
      runtimeUrl.hostname !== 'mysql' ||
      runtimeUrl.pathname !== '/lom' ||
      !/^[0-9a-f]{64}$/.test(runtimeUrl.password)
    )
      throw new Error('Unexpected runtime credentials; refusing changes');
    const accounts = await prisma.$queryRawUnsafe("SELECT User FROM mysql.user WHERE User='lom_runtime' AND Host='%'");
    if (!accounts.length)
      await prisma.$executeRawUnsafe(`CREATE USER 'lom_runtime'@'%' IDENTIFIED BY '${runtimeUrl.password}'`);
    await prisma.$executeRawUnsafe("GRANT SELECT, INSERT, UPDATE, DELETE ON `lom`.* TO 'lom_runtime'@'%'");
    const runtime = new PrismaClient({ datasourceUrl: runtimeUrl.toString() });
    try {
      const status = await runtime.$queryRawUnsafe('SELECT DATABASE() AS db, CURRENT_USER() AS account');
      await runtime.user.count();
      process.stdout.write(`Scoped runtime credentials validated: ${JSON.stringify(status)}\n`);
    } finally {
      await runtime.$disconnect();
    }
  } finally {
    await prisma.$disconnect();
  }
} else {
  throw new Error('Expected bootstrap or provision');
}
