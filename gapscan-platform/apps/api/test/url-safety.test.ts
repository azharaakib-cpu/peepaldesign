import test from 'node:test';
import assert from 'node:assert/strict';
import {createUrlGuard, isPrivateAddress, publicUrl} from '../src/url-safety.ts';

test('private, loopback, link-local, CGNAT and mapped addresses are private', () => {
  for (const ip of ['10.1.2.3', '127.0.0.1', '169.254.169.254', '172.16.0.1', '172.31.255.255', '192.168.1.1', '100.64.0.1', '0.0.0.0', '224.0.0.1', '198.18.0.5', '::1', '::', 'fd00::1', 'fe80::1', '::ffff:10.0.0.1', '::ffff:127.0.0.1', 'not-an-ip'])
    assert.equal(isPrivateAddress(ip), true, ip);
  for (const ip of ['8.8.8.8', '172.32.0.1', '104.16.1.1', '2606:4700::6810:84e5', '::ffff:8.8.8.8'])
    assert.equal(isPrivateAddress(ip), false, ip);
});

test('a public name that resolves to a private address is refused, and DNS failures fail closed', async () => {
  const answers: Record<string, string[]> = {'good.example.com': ['93.184.216.34'], 'rebind.example.com': ['93.184.216.34', '10.0.0.5'], 'meta.example.com': ['169.254.169.254']};
  let lookups = 0;
  const guard = createUrlGuard(async host => { lookups++; if (!answers[host]) throw new Error('ENOTFOUND'); return answers[host]!.map(address => ({address})); });
  assert.equal(await guard(new URL('https://good.example.com/a')), true);
  assert.equal(await guard(new URL('https://good.example.com/b')), true);
  assert.equal(lookups, 1, 'cached per host');
  assert.equal(await guard(new URL('https://rebind.example.com/')), false, 'any private answer refuses the host');
  assert.equal(await guard(new URL('https://meta.example.com/')), false);
  assert.equal(await guard(new URL('https://missing.example.com/')), false);
  assert.equal(await guard(new URL('http://good.example.com/')), false, 'still HTTPS only');
  assert.throws(() => publicUrl('https://127.0.0.1/'));
});
