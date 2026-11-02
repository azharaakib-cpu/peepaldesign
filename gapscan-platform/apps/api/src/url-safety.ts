// Ported from the prototype's engine/collect.mjs publicUrl: only public HTTPS
// hosts reach the fetchers, so a source URL cannot be used to probe the network
// GapScan runs on. Redirect targets must be re-checked with the same function.
const PRIVATE_HOST = /^(?:localhost|0\.0\.0\.0|127\.|10\.|192\.168\.|169\.254\.|172\.(?:1[6-9]|2\d|3[01])\.|0\.|224\.|255\.)/;

export class UnsafeUrlError extends Error {
  constructor(message: string) { super(message); this.name = 'UnsafeUrlError'; }
}

export function publicUrl(value: string): URL {
  let url: URL;
  try { url = new URL(value); } catch { throw new UnsafeUrlError('Enter a valid public HTTPS URL.'); }
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443') || !host.includes('.')
    || PRIVATE_HOST.test(host) || /^(?:\d+\.){3}\d+$/.test(host) || host.includes(':') || /\.(?:local|internal|localhost)$/.test(host))
    throw new UnsafeUrlError('Use a public HTTPS website or repository URL; private addresses are unsupported.');
  url.hash = '';
  return url;
}
