import {
  createCipheriv,
  createDecipheriv,
  createPrivateKey,
  createPublicKey,
  privateDecrypt,
  publicEncrypt,
  randomBytes,
  createHash,
} from 'node:crypto';
import { createReadStream } from 'node:fs';
import { open, readFile, stat, unlink } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { pathToFileURL } from 'node:url';

const FORMAT = 'lomleague-backup-v1';
const ALGORITHM = 'AES-256-GCM+RSA-OAEP-SHA256';

async function writeExclusive(destination, chunks) {
  // Never remove an existing destination when exclusive creation fails.
  const handle = await open(destination, 'wx', 0o600);
  try {
    await pipeline(Readable.from(chunks), handle.createWriteStream());
  } catch (error) {
    await handle.close().catch(() => {});
    await unlink(destination);
    throw error;
  }
}

export async function sealBackup(source, destination, recipientPem) {
  const recipient = createPublicKey(recipientPem);
  if (recipient.asymmetricKeyType !== 'rsa' || recipient.asymmetricKeyDetails.modulusLength < 2048) {
    throw new Error('Backup recipient requires an RSA key of at least 2048 bits');
  }
  const key = randomBytes(32);
  try {
    const iv = randomBytes(12);
    const header = Buffer.from(
      JSON.stringify({
        format: FORMAT,
        algorithm: ALGORITHM,
        iv: iv.toString('base64'),
        encryptedKey: publicEncrypt({ key: recipient, oaepHash: 'sha256' }, key).toString('base64'),
      }),
    );
    const length = Buffer.alloc(4);
    length.writeUInt32BE(header.length);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    cipher.setAAD(header);
    const hash = createHash('sha256');
    await writeExclusive(
      destination,
      (async function* () {
        yield length;
        yield header;
        for await (const chunk of createReadStream(source)) {
          hash.update(chunk);
          yield cipher.update(chunk);
        }
        yield cipher.final();
        yield cipher.getAuthTag();
      })(),
    );
    return { format: FORMAT, plaintextSha256: hash.digest('hex') };
  } finally {
    key.fill(0);
  }
}

export async function openBackup(source, destination, privatePem) {
  const handle = await open(source, 'r');
  let key;
  try {
    const size = (await stat(source)).size;
    const length = Buffer.alloc(4);
    if ((await handle.read(length, 0, 4, 0)).bytesRead !== 4) throw new Error('Truncated backup');
    const headerLength = length.readUInt32BE();
    if (headerLength < 1 || headerLength > 8192 || size < 4 + headerLength + 16)
      throw new Error('Invalid backup header');
    const header = Buffer.alloc(headerLength);
    await handle.read(header, 0, headerLength, 4);
    const metadata = JSON.parse(header.toString('utf8'));
    if (metadata.format !== FORMAT || metadata.algorithm !== ALGORITHM) throw new Error('Unsupported backup format');
    const iv = Buffer.from(metadata.iv, 'base64');
    if (iv.length !== 12) throw new Error('Invalid backup IV');
    key = privateDecrypt(
      { key: createPrivateKey(privatePem), oaepHash: 'sha256' },
      Buffer.from(metadata.encryptedKey, 'base64'),
    );
    const tag = Buffer.alloc(16);
    await handle.read(tag, 0, 16, size - 16);
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAAD(header);
    decipher.setAuthTag(tag);
    const hash = createHash('sha256');
    await writeExclusive(
      destination,
      (async function* () {
        if (size > 4 + headerLength + 16) {
          for await (const chunk of createReadStream(source, { start: 4 + headerLength, end: size - 17 })) {
            const plaintext = decipher.update(chunk);
            hash.update(plaintext);
            yield plaintext;
          }
        }
        const last = decipher.final();
        hash.update(last);
        yield last;
      })(),
    );
    return { format: FORMAT, plaintextSha256: hash.digest('hex') };
  } finally {
    key?.fill(0);
    await handle.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [command, source, destination, keyFile] = process.argv.slice(2);
  try {
    if (!['seal', 'open'].includes(command) || !source || !destination || !keyFile)
      throw new Error('Usage: backup-envelope.mjs seal|open source destination key.pem');
    const pem = await readFile(keyFile);
    const result = await (command === 'seal' ? sealBackup : openBackup)(source, destination, pem);
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch (error) {
    process.stderr.write(`Backup envelope failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}
