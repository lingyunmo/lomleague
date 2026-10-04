import { describe, it, expect } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'node:crypto';

describe.skipIf(!process.env.LOM_TEST_DATABASE_URL)('disposable database runtime permissions', () => {
  it('allows transactional CRUD but denies DDL without touching business tables', async () => {
    const target = new URL(process.env.LOM_TEST_DATABASE_URL);
    if (
      !['localhost', '127.0.0.1'].includes(target.hostname) ||
      !['/lom_local_test', '/lom_ci_test'].includes(target.pathname)
    )
      throw new Error('Only an explicit disposable local/CI database is allowed');
    const admin = new PrismaClient({ datasourceUrl: target.toString() });
    const name = `lom_test_${randomBytes(6).toString('hex')}`;
    const password = randomBytes(32).toString('hex');
    const table = `${name}_probe`;
    let created = false,
      tableCreated = false,
      runtime;
    try {
      await admin.$executeRawUnsafe(`CREATE USER '${name}'@'%' IDENTIFIED BY '${password}'`);
      created = true;
      await admin.$executeRawUnsafe(
        `GRANT SELECT, INSERT, UPDATE, DELETE ON \`${target.pathname.slice(1)}\`.* TO '${name}'@'%'`,
      );
      await admin.$executeRawUnsafe(`CREATE TABLE \`${table}\` (id INT PRIMARY KEY, value VARCHAR(64)) ENGINE=InnoDB`);
      tableCreated = true;
      target.username = name;
      target.password = password;
      runtime = new PrismaClient({ datasourceUrl: target.toString() });
      await runtime.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`INSERT INTO \`${table}\` VALUES (1, '中文🧱100%')`);
        await tx.$executeRawUnsafe(`UPDATE \`${table}\` SET value='untouched business tables' WHERE id=1`);
        expect(await tx.$queryRawUnsafe(`SELECT value FROM \`${table}\``)).toEqual([
          { value: 'untouched business tables' },
        ]);
        await tx.$executeRawUnsafe(`DELETE FROM \`${table}\` WHERE id=1`);
      });
      await expect(runtime.$executeRawUnsafe(`CREATE TABLE \`${table}_denied\` (id INT)`)).rejects.toThrow(/denied/i);
    } finally {
      await runtime?.$disconnect();
      if (tableCreated) await admin.$executeRawUnsafe(`DROP TABLE \`${table}\``);
      if (created) await admin.$executeRawUnsafe(`DROP USER '${name}'@'%'`);
      await admin.$disconnect();
    }
  });
});
