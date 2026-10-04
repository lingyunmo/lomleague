import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';

const { PrismaClient } = createRequire('/app/lomserver/package.json')('@prisma/client');
const connection = new URL(process.env.DATABASE_URL);
if (connection.hostname !== 'mysql' || connection.pathname !== '/lom' || connection.username !== 'root')
  throw new Error('Refusing migration outside the explicit administrative lom connection');
const migration = '20261005000000_widen_avatar_url';
const prisma = new PrismaClient();
const serialize = (value) => JSON.stringify(value, (_, item) => (typeof item === 'bigint' ? item.toString() : item));
const hash = (value) => createHash('sha256').update(serialize(value)).digest('hex');
async function businessDigest() {
  const rows = await Promise.all(
    ['user', 'forumPost', 'forumReply', 'article', 'like', 'notification'].map((model) =>
      prisma[model].findMany({ orderBy: { id: 'asc' } }),
    ),
  );
  return { digest: hash(rows), counts: rows.map((items) => items.length) };
}
try {
  const oldHistory = await prisma.$queryRawUnsafe(
    'SELECT * FROM _prisma_migrations WHERE migration_name <> ? ORDER BY id',
    migration,
  );
  if (oldHistory.some((row) => !row.finished_at && !row.rolled_back_at))
    throw new Error('Unfinished historical migration; refusing automatic repair');
  const sourceNames = (await readdir('/migration/migrations', { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
  if (!sourceNames.includes(migration)) throw new Error('Reviewed migration source is missing');
  if (
    sourceNames.some(
      (name) =>
        name !== migration &&
        !oldHistory.some((row) => row.migration_name === name && row.finished_at && !row.rolled_back_at),
    )
  )
    throw new Error('Historical migration is pending; refusing to replay it');
  const reviewedSql = (await readFile(`/migration/migrations/${migration}/migration.sql`, 'utf8'))
    .replace(/^--.*$/gm, '')
    .trim();
  if (
    reviewedSql !==
    "ALTER TABLE `User` MODIFY COLUMN `avatar` VARCHAR(2048) NOT NULL DEFAULT '/default-avatar.png', ALGORITHM=INPLACE, LOCK=NONE;"
  )
    throw new Error('Migration differs from the single reviewed additive statement');
  const before = await businessDigest();
  await new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ['node_modules/prisma/build/index.js', 'migrate', 'deploy', '--schema=/migration/schema.prisma'],
      { cwd: '/app/lomserver', stdio: ['ignore', 'inherit', 'inherit'], env: process.env },
    );
    child.once('error', reject);
    child.once('exit', (code) => (code === 0 ? resolve() : reject(new Error(`Scoped migration exited ${code}`))));
  });
  const after = await businessDigest();
  const newHistory = await prisma.$queryRawUnsafe(
    'SELECT * FROM _prisma_migrations WHERE migration_name <> ? ORDER BY id',
    migration,
  );
  if (before.digest !== after.digest || hash(oldHistory) !== hash(newHistory))
    throw new Error('Unexpected business/history changes; stop and retain backups for investigation');
  const column = await prisma.$queryRawUnsafe(
    "SELECT CHARACTER_MAXIMUM_LENGTH AS max_length, CHARACTER_SET_NAME AS charset FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='lom' AND TABLE_NAME='User' AND COLUMN_NAME='avatar'",
  );
  if (String(column[0]?.max_length) !== '2048' || column[0].charset !== 'utf8mb4')
    throw new Error('Avatar column verification failed');
  process.stdout.write(
    `${serialize({ migrationVerified: migration, businessRowsUnchanged: true, oldHistoryUnchanged: true, counts: after.counts })}\n`,
  );
} finally {
  await prisma.$disconnect();
}
