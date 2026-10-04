import express from 'express';
import path from 'node:path';

export function setUploadHeaders(res, filePath) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  // Native PDF viewers have their own isolation; sandbox can prevent them loading.
  // Other uploaded documents must never execute as part of the application origin.
  const policy =
    path.extname(filePath).toLowerCase() === '.pdf'
      ? "frame-ancestors 'self'"
      : "sandbox allow-downloads; default-src 'none'; img-src 'self' data:; media-src 'self'; base-uri 'none'; form-action 'none'";
  res.setHeader('Content-Security-Policy', policy);
}

export function createUploadStatic(directory) {
  return express.static(directory, { dotfiles: 'ignore', setHeaders: setUploadHeaders });
}
