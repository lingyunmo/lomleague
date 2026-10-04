import path from 'node:path';

// Multipart filenames are text, not URLs. Never decode literal % sequences.
function sanitizePart(value) {
  return Array.from(value)
    .map((char) => (char.charCodeAt(0) < 32 || '/\\:*?"<>|&'.includes(char) ? '_' : char))
    .slice(0, 100)
    .join('');
}

export function createStoredFilename(originalname, timestamp = Date.now()) {
  const filename = path.posix.basename(originalname.replace(/\\/g, '/'));
  const ext = path.extname(filename);
  const base = sanitizePart(filename.slice(0, filename.length - ext.length)) || 'unnamed_file';
  return `${timestamp}_${base}${sanitizePart(ext)}`;
}
