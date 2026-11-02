import test from 'node:test';
import assert from 'node:assert/strict';
import {listReferences, loadReference, REFERENCE_SOURCES} from '@gapscan/library';

test('every configured reference has a pinned, schema-valid snapshot with checksummed sources', async () => {
  const list = await listReferences();
  assert.deepEqual(list.map(r => r.id).sort(), REFERENCE_SOURCES.map(r => r.id).sort());
  for (const summary of list) {
    const reference = (await loadReference(summary.id))!;
    assert.ok(reference.components.length >= 10, `${summary.id} has components`);
    assert.ok(reference.sources.every(s => /^[0-9a-f]{64}$/.test(s.sha256) && s.uri.startsWith('https://cdn.jsdelivr.net/npm/')), 'pinned CDN artifacts with checksums');
    assert.ok(reference.components.every(c => !['Miscellaneous', 'Utilities and tooling'].includes(c.category)));
    assert.ok(reference.components.some(c => c.canonical === 'Button' && c.category === 'Actions'), `${summary.id} has a Button`);
  }
});

test('Polaris and Carbon buttons carry their published variants, sizes and states', async () => {
  const polaris = (await loadReference('polaris-13.9.5'))!.components.find(c => c.canonical === 'Button')!;
  assert.ok(['primary', 'plain', 'tone=critical'].every(v => polaris.variants.some(x => x.name === v)));
  assert.ok(['slim', 'large'].every(s => polaris.sizes.includes(s)));
  assert.ok(['loading', 'disabled', 'focus-visible'].every(s => polaris.statesObserved.includes(s)));
  const carbon = (await loadReference('carbon-styles-1.68.0'))!.components.filter(c => c.canonical === 'Button');
  assert.equal(carbon.length, 1, 'only the btn class is named Button');
});

test('unknown or unsafe ids return nothing', async () => {
  assert.equal(await loadReference('nope'), null);
  assert.equal(await loadReference('../../package'), null);
});

test('reference role colours match each library’s published palette', async () => {
  const expected: Record<string, Record<string, string>> = {
    'bootstrap-5.3.3': {primary: '#0d6efd', danger: '#dc3545', success: '#198754'},
    'polaris-13.9.5': {primary: '#303030', danger: '#c70a24', success: '#047b5d'},
    'carbon-styles-1.68.0': {primary: '#0f62fe', danger: '#da1e28', success: '#24a148'},
    'bulma-1.0.2': {primary: '#00d1b2', danger: '#ff6685', success: '#48c78e'},
  };
  for (const [id, roles] of Object.entries(expected)) {
    const reference = (await loadReference(id))!;
    for (const [role, hex] of Object.entries(roles)) assert.equal(String(reference.tokens.find(t => t.path === `color.${role}`)?.value).toLowerCase(), hex, `${id} ${role}`);
    assert.ok(reference.specimens.length >= reference.components.length * 0.8, `${id} has previews for most components`);
  }
});
