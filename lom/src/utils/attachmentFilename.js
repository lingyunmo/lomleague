// Only URL path segments are decoded here. Multipart filenames are already text.
// Keep the business timestamp and decode exactly once, including literal % names.
export function getAttachmentFilename(url) {
  if (typeof url !== 'string') return '';
  const pathname = url.split(/[?#]/, 1)[0];
  const segment = pathname.slice(pathname.lastIndexOf('/') + 1);
  try {
    return decodeURIComponent(segment);
  } catch {
    // Older readable URLs may contain a literal %, not a valid escape sequence.
    return segment;
  }
}
