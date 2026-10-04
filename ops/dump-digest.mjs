import { createHash } from 'node:crypto';
import { StringDecoder } from 'node:string_decoder';
import { pathToFileURL } from 'node:url';

export function canonicalDumpLine(line) {
  // MySQL may expand a column's implicit charset on CREATE TABLE after restore.
  // Normalize only this redundant DDL clause, never INSERT values or filenames.
  return /^ {2}`[^`]+` /.test(line) ? line.replace(/ CHARACTER SET ([a-zA-Z0-9_]+)(?= COLLATE \1_)/g, '') : line;
}

export async function dumpDigest(stream) {
  const hash = createHash('sha256');
  const decoder = new StringDecoder('utf8');
  let remaining = '';
  const consume = (value) => {
    remaining += value;
    let end;
    while ((end = remaining.indexOf('\n')) !== -1) {
      hash.update(`${canonicalDumpLine(remaining.slice(0, end))}\n`);
      remaining = remaining.slice(end + 1);
    }
  };
  for await (const chunk of stream) consume(decoder.write(chunk));
  consume(decoder.end());
  if (remaining) hash.update(canonicalDumpLine(remaining));
  return hash.digest('hex');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.stdout.write(`${await dumpDigest(process.stdin)}\n`);
}
