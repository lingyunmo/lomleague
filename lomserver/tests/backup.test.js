import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { generateKeyPairSync } from 'node:crypto';
import { mkdtemp, readFile, writeFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { sealBackup, openBackup } from '../../ops/backup-envelope.mjs';
import { canonicalDumpLine, dumpDigest } from '../../ops/dump-digest.mjs';
import { Readable } from 'node:stream';

describe('authenticated lom backup envelopes', () => {
  let directory, publicKey, privateKey;
  beforeAll(async () => {
    directory = await mkdtemp(path.join(tmpdir(), 'lom-backup-envelope-test-'));
    ({ publicKey, privateKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    }));
  });
  afterAll(async () => {
    await rm(directory, { recursive: true });
  });
  it.each([Buffer.alloc(0), Buffer.from('论文🧱100% %E4%B8%AD\nfixture'), Buffer.alloc(250000, 0xaa)])(
    'restores exact bytes and matching hashes (%#)',
    async (bytes) => {
      const base = path.join(directory, `roundtrip-${bytes.length}`);
      await writeFile(`${base}.tar`, bytes);
      const sealed = await sealBackup(`${base}.tar`, `${base}.lom`, publicKey);
      const restored = await openBackup(`${base}.lom`, `${base}.restored`, privateKey);
      expect(restored.plaintextSha256).toBe(sealed.plaintextSha256);
      expect(await readFile(`${base}.restored`)).toEqual(bytes);
      if (bytes.length) expect((await readFile(`${base}.lom`)).includes(bytes)).toBe(false);
    },
  );
  it('never overwrites or removes a destination that already exists', async () => {
    const source = path.join(directory, 'existing-source');
    const destination = path.join(directory, 'existing-destination');
    await writeFile(source, 'fixture');
    await writeFile(destination, 'must-stay');
    await expect(sealBackup(source, destination, publicKey)).rejects.toHaveProperty('code', 'EEXIST');
    expect(await readFile(destination, 'utf8')).toBe('must-stay');
    const encrypted = path.join(directory, 'existing.lom');
    await sealBackup(source, encrypted, publicKey);
    await expect(openBackup(encrypted, destination, privateKey)).rejects.toHaveProperty('code', 'EEXIST');
    expect(await readFile(destination, 'utf8')).toBe('must-stay');
  });
  it.each(['ciphertext', 'tag', 'header', 'truncate'])(
    'rejects tampered %s without leaving plaintext',
    async (change) => {
      const source = path.join(directory, `tamper-${change}`);
      await writeFile(source, 'private fixture bytes must not survive failed authentication');
      await sealBackup(source, `${source}.lom`, publicKey);
      let bytes = await readFile(`${source}.lom`);
      const headerSize = bytes.readUInt32BE();
      if (change === 'ciphertext') bytes[4 + headerSize] ^= 1;
      if (change === 'tag') bytes[bytes.length - 1] ^= 1;
      if (change === 'header') bytes[12] ^= 1;
      if (change === 'truncate') bytes = bytes.subarray(0, 3);
      await writeFile(`${source}.corrupt`, bytes);
      await expect(openBackup(`${source}.corrupt`, `${source}.restored`, privateKey)).rejects.toThrow();
      expect(await readdir(directory)).not.toContain(path.basename(`${source}.restored`));
    },
  );
  it('rejects an unrelated private key', async () => {
    const source = path.join(directory, 'wrong-key');
    await writeFile(source, 'fixture');
    await sealBackup(source, `${source}.lom`, publicKey);
    const wrong = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      publicKeyEncoding: { type: 'spki', format: 'pem' },
    }).privateKey;
    await expect(openBackup(`${source}.lom`, `${source}.restored`, wrong)).rejects.toThrow();
    expect(await readdir(directory)).not.toContain('wrong-key.restored');
  });
});

describe('backup and restoration scope guards', () => {
  it('accepts only equivalent implicit/explicit DDL charsets and retains every data byte', async () => {
    const original =
      "  `title` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL;\nINSERT INTO User VALUES ('论文🧱100% CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');\n";
    const restored = original.replace('varchar(191) COLLATE', 'varchar(191) CHARACTER SET utf8mb4 COLLATE');
    const digest = (text) => dumpDigest(Readable.from([Buffer.from(text)]));
    expect(await digest(restored)).toBe(await digest(original));
    expect(await digest(restored.replace('varchar(191)', 'varchar(2048)'))).not.toBe(await digest(original));
    expect(await digest(restored.replace('论文', 'changed'))).not.toBe(await digest(original));
    expect(
      canonicalDumpLine("INSERT INTO User VALUES (' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci')"),
    ).toContain('CHARACTER SET utf8mb4');
    expect(canonicalDumpLine('  `name` varchar(191) CHARACTER SET latin1 COLLATE utf8mb4_unicode_ci')).toContain(
      'CHARACTER SET latin1',
    );
  });
  it('permits only the reviewed widening and refuses historical migration replay', async () => {
    const migration = await readFile(new URL('../../ops/migrate-lom.mjs', import.meta.url), 'utf8');
    const apply = await readFile(new URL('../../ops/apply-avatar-maintenance.sh', import.meta.url), 'utf8');
    const sql = await readFile(
      new URL('../prisma/migrations/20261005000000_widen_avatar_url/migration.sql', import.meta.url),
      'utf8',
    );
    expect(sql.replace(/^--.*$/gm, '').trim()).toBe(
      "ALTER TABLE `User` MODIFY COLUMN `avatar` VARCHAR(2048) NOT NULL DEFAULT '/default-avatar.png', ALGORITHM=INPLACE, LOCK=NONE;",
    );
    expect(migration).toContain('Historical migration is pending; refusing to replay it');
    expect(migration).toContain('before.digest !== after.digest');
    expect(migration).toContain('hash(oldHistory) !== hash(newHistory)');
    expect(apply).toContain('Backup checksum mismatch');
    expect(apply).toContain('trap cleanup EXIT');
    expect(apply).not.toMatch(/db push|reset|resolve/);
  });
  it('never backs up running raw mysql_data or restores into the production container', async () => {
    const common = await readFile(new URL('../../ops/common.sh', import.meta.url), 'utf8');
    const backup = await readFile(new URL('../../ops/backup.sh', import.meta.url), 'utf8');
    const restore = await readFile(new URL('../../ops/verify-restore.sh', import.meta.url), 'utf8');
    expect(common).toContain('LOM_APP=lom-app');
    expect(common).toContain('LOM_MYSQL=lom-mysql');
    expect(common).toContain('com.docker.compose.project');
    expect(backup).toContain('trap restart_application EXIT');
    expect(backup).toContain('Insufficient backup staging headroom');
    expect(common).toContain('--single-transaction');
    expect(backup).not.toMatch(/tar[^\n]*mysql_data/);
    expect(restore).toContain('--internal');
    expect(restore).toContain('Refusing restoration into a nonempty database');
    expect(restore).toContain('lomleague.maintenance');
    expect(restore).not.toContain('docker exec -i "$LOM_MYSQL" mysql');
    expect(common).toContain('.lom-owned-restore');
  });
});
