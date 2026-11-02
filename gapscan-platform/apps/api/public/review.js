// Extraction review (architecture Part 1 §1.8): plain language first, raw evidence behind a toggle.
const params = new URLSearchParams(location.search), id = params.get('id');
const SEVERITY = {major: 0, minor: 1, info: 2};
const band = c => c >= 0.8 ? 'Confirmed' : c >= 0.5 ? 'Likely' : 'Inferred';
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const swatch = (hex, title, note) => el('figure', {class: 'swatch', style: 'margin:0'}, el('i', {style: `background:${hex}`, 'aria-hidden': 'true'}), el('div', {}, el('strong', {}, title), el('br'), el('code', {}, hex), note ? el('div', {class: 'muted'}, note) : null));

async function load() {
  if (!id) { $('#subtitle').textContent = 'No extraction id in the link.'; return; }
  let eds, scales;
  try { [eds, scales] = await Promise.all([api(`/v1/extractions/${id}?include=full`), api(`/v1/extractions/${id}/scales`)]); }
  catch (error) { $('#subtitle').textContent = error.message; return; }
  const evidence = new Map(eds.evidence.map(e => [e.id, e]));
  const sourceNames = eds.sources.map(s => s.label || s.uri);
  $('#subtitle').textContent = `Version ${eds.version} · from ${sourceNames.join(', ')} · ${new Date(eds.createdAt).toLocaleString()}`;

  const stat = (value, label) => el('div', {class: 'stat'}, el('b', {}, value), el('span', {}, label));
  $('#stats').replaceChildren(
    stat(scales.colors.length, 'distinct colours'),
    stat(scales.type ? scales.type.sizes.length : 0, scales.type ? `type sizes · ratio ${scales.type.ratio}` : 'type sizes'),
    stat(scales.spacing.baseUnit ? `${scales.spacing.baseUnit}px` : 'None', 'spacing grid'),
    stat(eds.components.length, 'components'),
    stat(eds.quirks.length, 'findings'),
  );

  const findings = [...eds.quirks].sort((a, b) => SEVERITY[a.severity] - SEVERITY[b.severity]);
  $('#findings').replaceChildren(...(findings.length ? findings.map(q => el('div', {class: 'finding'},
    el('span', {class: `pill ${q.severity}`}, q.severity === 'major' ? 'Important' : q.severity === 'minor' ? 'Worth a look' : 'Note'),
    el('div', {}, el('div', {}, q.summary), q.evidence.length ? el('details', {}, el('summary', {class: 'muted'}, `Evidence (${q.evidence.length})`),
      el('ul', {}, q.evidence.slice(0, 12).map(id => { const e = evidence.get(id); return el('li', {}, el('code', {}, e ? `${e.locator} — ${e.raw.slice(0, 160)}` : id)); }))) : null),
  )) : [el('p', {class: 'empty'}, 'Nothing stood out.')]));

  $('#roles').replaceChildren(...(scales.roles.length ? scales.roles.map(r => swatch(r.hex, r.role, `Inferred: ${r.reason.toLowerCase()}`)) : [el('p', {class: 'empty'}, 'No colour roles could be inferred.')]));
  const palette = scales.colors.slice(0, 48);
  $('#palette').replaceChildren(...palette.map(c => swatch(c.hex, plural(c.count, 'use'), c.members.length > 1 ? `${c.members.length} near-identical values merged` : null)));
  if (scales.colors.length > palette.length) $('#palette').after(el('p', {class: 'muted'}, `${scales.colors.length - palette.length} less-used colours are listed under Technical details.`));

  const bodyFamily = eds.tokens.find(t => t.path === 'font.family.body')?.value || 'inherit', headingFamily = eds.tokens.find(t => t.path === 'font.family.heading')?.value;
  if (scales.type) {
    $('#type-summary').textContent = `Body text ${scales.type.basePx}px in ${bodyFamily}${headingFamily ? `, headings in ${headingFamily}` : ''}. Sizes ${scales.type.irregular ? 'do not follow' : 'follow'} a ${scales.type.ratio} scale.`;
    $('#type-scale').replaceChildren(...scales.type.sizes.slice(0, 14).map(s => el('div', {class: 'typerow'},
      el('div', {class: 'meta'}, `${s.role} · ${s.px}px`, el('br'), plural(s.count, 'use')),
      el('div', {class: 'sample', style: `font-size:${Math.min(s.px, 64)}px;font-family:${JSON.stringify(s.role === 'body' ? bodyFamily : headingFamily || bodyFamily)}`}, 'The quick brown fox'))));
  } else $('#type-summary').textContent = 'No font sizes were found in these sources.';

  const sp = scales.spacing;
  $('#space-summary').textContent = sp.baseUnit ? `${Math.round(sp.coverage * 100)}% of spacing values fit a ${sp.baseUnit}px grid.` : sp.steps.length ? 'Spacing values do not follow a 4px or 8px grid.' : 'No spacing values were found.';
  const max = Math.max(1, ...sp.steps);
  $('#spacing').replaceChildren(...sp.steps.slice(0, 16).flatMap(px => [el('span', {}, `${px}px`), el('div', {class: 'bar', style: `width:${Math.max(2, px / max * 100)}%`})]));
  $('#radius').replaceChildren(...(scales.radius.length ? scales.radius.map(r => el('div', {class: 'shape', style: `border-radius:${r.px === 'full' ? '999px' : r.px + 'px'}`}, r.name)) : [el('span', {class: 'empty'}, 'None found')]));
  $('#shadows').replaceChildren(...(scales.elevation.length ? scales.elevation.slice(0, 6).map(s => el('div', {class: 'shape', style: `box-shadow:${s.value};border-color:transparent`}, `level ${s.level}`)) : [el('span', {class: 'empty'}, 'None found')]));

  const header = el('tr', {}, el('th', {}, 'Component'), el('th', {}, 'Category'), el('th', {}, 'States seen'), el('th', {}, 'Missing'), el('th', {}, 'Variants and sizes'), el('th', {}, 'Confidence'));
  $('#component-table').replaceChildren(header, ...(eds.components.length ? eds.components.map(c => el('tr', {},
    el('td', {}, el('strong', {}, c.canonical), c.rawNames.length > 1 ? el('div', {class: 'muted'}, c.rawNames.slice(0, 4).join(', ')) : null),
    el('td', {}, c.category), el('td', {}, c.statesObserved.join(', ') || '—'),
    el('td', {}, c.statesMissing.length ? c.statesMissing.map(s => el('span', {class: `pill ${s.startsWith('focus') ? 'major' : 'minor'}`, style: 'margin-right:4px'}, s)) : '—'),
    el('td', {}, [...c.variants.map(v => v.name), ...c.sizes.map(s => 'size ' + s)].slice(0, 6).join(', ') || '—'), el('td', {}, band(c.confidence)),
  )) : [el('tr', {}, el('td', {colspan: 6, class: 'empty'}, 'No components were found.'))]));

  const assetName = new Map(eds.sources.map(s => [s.id, s.label || s.uri]));
  $('#coverage-list').replaceChildren(...eds.coverage.perAsset.map(a => el('li', {class: 'source'},
    el('span', {}, assetName.get(a.assetId) || a.assetId, a.failed.length ? el('div', {class: 'muted'}, a.failed.slice(0, 3).map(f => f.reason).join(' · ')) : null),
    el('span', {class: `pill ${a.fetched ? (a.budgetHit ? 'minor' : 'ok') : 'major'}`}, a.fetched ? `${plural(a.fetched, 'part')} read${a.budgetHit ? ', budget reached' : ''}` : 'Not read'))),
    el('li', {class: 'muted', style: 'padding-top:8px'}, `Viewports: ${eds.coverage.viewports.length ? eds.coverage.viewports.map(v => v + 'px').join(', ') : 'n/a'} · Themes: ${eds.coverage.themes.join(', ') || 'light only'}`));

  // Tokens render in pages so very large systems stay responsive.
  let shown = 100;
  const renderTokens = () => {
    const query = $('#token-filter').value.trim().toLowerCase();
    const rows = eds.tokens.filter(t => !query || t.path.toLowerCase().includes(query) || String(t.value).toLowerCase().includes(query));
    $('#token-table').replaceChildren(el('tr', {}, el('th', {}, 'Token'), el('th', {}, 'Value'), el('th', {}, 'Tier'), el('th', {}, 'Status'), el('th', {}, 'Confidence'), el('th', {}, 'Evidence')),
      ...rows.slice(0, shown).map(t => el('tr', {}, el('td', {}, el('code', {}, t.path)), el('td', {}, el('code', {}, String(t.value)), t.aliasOf ? el('div', {class: 'muted'}, '→ ' + t.aliasOf) : null),
        el('td', {}, t.tier), el('td', {}, t.status === 'unresolved' ? el('span', {class: 'pill minor'}, 'unresolved') : t.status), el('td', {}, band(t.confidence)),
        el('td', {}, t.evidence.slice(0, 2).map(id => el('div', {}, el('code', {}, evidence.get(id)?.locator || id))), t.evidence.length > 2 ? el('div', {class: 'muted'}, `+${t.evidence.length - 2} more`) : null))));
    $('#more-tokens').hidden = rows.length <= shown;
    $('#more-tokens').textContent = `Show more (${rows.length - shown} left)`;
  };
  $('#token-filter').addEventListener('input', () => { shown = 100; renderTokens(); });
  $('#more-tokens').addEventListener('click', () => { shown += 200; renderTokens(); });
  $('#technical').addEventListener('toggle', renderTokens, {once: true});
}
load();

// Reference recommendations and starting a GapScan from this extraction.
async function recommendations() {
  if (!id) return;
  try {
    const ranked = await api(`/v1/extractions/${id}/recommendations`);
    $('#recs').replaceChildren(...ranked.map((r, i) => el('div', {class: 'rec'},
      el('div', {}, el('strong', {}, `${r.library} ${r.version}`), i === 0 ? el('span', {class: 'pill ok', style: 'margin-left:8px'}, 'Closest fit') : null, el('div', {class: 'muted'}, `${r.reason} · ${r.framework}`)),
      el('button', {class: i === 0 ? 'primary' : '', type: 'button', onclick: () => startScan(r.id)}, 'Run GapScan'))));
  } catch (error) { $('#recs').replaceChildren(el('p', {class: 'error'}, error.message)); }
}
async function startScan(referenceId) {
  const box = $('#scan-log'); box.hidden = false; box.textContent = 'Starting…\n';
  document.querySelectorAll('#recs button').forEach(b => { b.disabled = true; });
  try {
    const {events} = await api('/v1/gapscans', {method: 'POST', body: JSON.stringify({edsId: id, referenceId})});
    const stream = new EventSource(events);
    stream.addEventListener('progress', e => { box.textContent += JSON.parse(e.data).body.message + '\n'; });
    stream.addEventListener('complete', e => { stream.close(); location.href = `/app/gapscan.html?id=${JSON.parse(e.data).body.resultId}`; });
    stream.addEventListener('failed', e => { stream.close(); box.textContent += 'Failed: ' + JSON.parse(e.data).body.message; document.querySelectorAll('#recs button').forEach(b => { b.disabled = false; }); });
  } catch (error) { box.textContent += error.message; document.querySelectorAll('#recs button').forEach(b => { b.disabled = false; }); }
}
recommendations();

// Hand-off downloads and missing-object review.
const FORMATS = [['dtcg', 'tokens.json (DTCG)'], ['css', 'CSS variables'], ['tailwind4', 'Tailwind v4 theme'], ['scss', 'SCSS variables']];
if (id) $('#exports').replaceChildren(...FORMATS.map(([format, label]) => el('a', {class: 'button', href: `/v1/extractions/${id}/export?format=${format}`, download: ''}, label)));
try { $('#reviewer').value = localStorage.getItem('gapscan-reviewer') || ''; } catch {}
$('#reviewer').addEventListener('change', () => { try { localStorage.setItem('gapscan-reviewer', $('#reviewer').value.trim()); } catch {} });
const PROVENANCE = {extracted: 'From your sources', inferred: 'Inferred by GapScan', drafted: 'Draft'};
function objectBlock(object) {
  const pct = Math.round(object.completeness * 100);
  const block = el('details', {class: 'object'}, el('summary', {}, el('span', {class: 'name'}, object.title), el('span', {class: 'meter', 'aria-hidden': 'true'}, el('i', {style: `width:${pct}%`})), el('span', {class: 'muted'}, `${pct}%`)));
  for (const s of object.sections) {
    const approve = el('button', {type: 'button'}, s.approval ? `Approved by ${s.approval.by}` : 'Approve');
    approve.disabled = !!s.approval;
    approve.addEventListener('click', async () => {
      const by = $('#reviewer').value.trim();
      if (!by) { $('#reviewer').focus(); return; }
      approve.disabled = true;
      try { const updated = await api(`/v1/extractions/${id}/objects/${object.kind}/sections/${encodeURIComponent(s.id)}/approval`, {method: 'PUT', body: JSON.stringify({by})}); const fresh = objectBlock(updated); fresh.open = true; block.replaceWith(fresh); }
      catch (error) { approve.disabled = false; approve.textContent = error.message; }
    });
    block.append(el('div', {class: 'section'},
      el('div', {class: 'row'}, el('strong', {}, s.title), el('span', {class: `pill ${s.status === 'present' ? 'ok' : s.status === 'partial' ? 'minor' : ''}`}, s.status), el('span', {class: 'pill'}, PROVENANCE[s.provenance]), s.stale ? el('span', {class: 'pill major'}, 'Changed since approval') : null),
      markdown(s.content), el('div', {class: 'row'}, approve)));
  }
  return block;
}
async function objects() {
  if (!id) return;
  try { const list = await api(`/v1/extractions/${id}/objects`); $('#objects').replaceChildren(...list.map(objectBlock)); }
  catch (error) { $('#objects').replaceChildren(el('p', {class: 'error'}, error.message)); }
}
objects();

// Brand assets: template fields are rendered from the server's template list.
let templates = [];
const FIELD_LABELS = {name: 'Name', role: 'Role', email: 'Email', phone: 'Phone', website: 'Website', title: 'Title', subtitle: 'Subtitle', points: 'Points (separate with ;)', body: 'Message', cta: 'Button label', url: 'Button link (https://…)'};
function assetFields() {
  const template = templates.find(t => t.id === $('#asset-template').value);
  $('#asset-fields').replaceChildren(...(template?.fields ?? []).map(f => el('label', {}, FIELD_LABELS[f] || f, el('input', {type: 'text', name: `field-${f}`, maxlength: f === 'body' || f === 'points' ? '1200' : '160'}))));
}
async function assets() {
  if (!id) return;
  templates = await api('/v1/templates');
  $('#asset-template').replaceChildren(...templates.map(t => el('option', {value: t.id}, t.label)));
  assetFields();
}
$('#asset-template').addEventListener('change', assetFields);
$('#asset-form').addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.target, data = {};
  for (const input of form.querySelectorAll('[name^="field-"]')) if (input.value.trim()) data[input.name.slice(6)] = input.value.trim();
  const result = $('#asset-result');
  result.replaceChildren(el('p', {class: 'muted'}, 'Rendering…'));
  try {
    const {jobId, events} = await api(`/v1/extractions/${id}/assets`, {method: 'POST', body: JSON.stringify({template: form.elements.template.value, brandName: form.elements.brandName.value, data})});
    const stream = new EventSource(events);
    stream.addEventListener('failed', e => { stream.close(); result.replaceChildren(el('p', {class: 'error'}, JSON.parse(e.data).body.message)); });
    stream.addEventListener('complete', async () => {
      stream.close();
      const manifest = await api(`/v1/assets/${jobId}`), url = `/v1/assets/${jobId}/file`;
      result.replaceChildren(
        manifest.contentType === 'image/png' ? el('img', {src: url, alt: `${manifest.template.label} preview`, style: 'max-width:100%;border:1px solid var(--line);border-radius:8px'})
          : manifest.contentType.startsWith('text/html') ? el('iframe', {src: url, sandbox: '', title: 'Email preview', style: 'width:100%;height:520px;border:1px solid var(--line);border-radius:8px;background:#fff'})
          : el('p', {}, el('a', {href: `${url}?download=1`}, `Download ${manifest.file}`)),
        el('ul', {class: 'plain'}, manifest.checks.map(c => el('li', {class: 'source'}, el('span', {}, c.message), el('span', {class: `pill ${c.pass ? 'ok' : 'minor'}`}, c.pass ? 'Pass' : 'Check')))),
        el('a', {class: 'button', href: `${url}?download=1`}, 'Download'));
    });
  } catch (error) { result.replaceChildren(el('p', {class: 'error'}, error.message)); }
});
assets();

// Figma Variables: preview, then an explicit confirmation that applies exactly that preview.
$('#figma-form').addEventListener('submit', async event => {
  event.preventDefault();
  const fileUrl = event.target.elements.fileUrl.value.trim(), out = $('#figma-result');
  out.replaceChildren(el('p', {class: 'muted'}, 'Reading the file’s variables…'));
  try {
    const plan = await api(`/v1/extractions/${id}/figma-sync/plan`, {method: 'POST', body: JSON.stringify({fileUrl})});
    const row = c => el('tr', {}, el('td', {}, el('code', {}, c.name)), el('td', {}, c.mode), el('td', {}, c.before ?? 'new'), el('td', {}, c.after));
    const apply = el('button', {class: 'primary', type: 'button'}, `Apply ${plan.create.length + plan.update.length} changes to Figma`);
    apply.disabled = !plan.create.length && !plan.update.length;
    apply.addEventListener('click', async () => {
      if (!confirm(`Write ${plan.create.length} new and ${plan.update.length} changed values to the “${plan.collection}” collection in this Figma file?`)) return;
      apply.disabled = true;
      try { const done = await api(`/v1/extractions/${id}/figma-sync/apply`, {method: 'POST', body: JSON.stringify({fileUrl, hash: plan.hash, confirm: true})}); out.append(el('p', {}, done.applied ? `Done: ${done.created} new, ${done.updated} changed.` : done.message)); }
      catch (error) { apply.disabled = false; out.append(el('p', {class: 'error'}, error.message)); }
    });
    out.replaceChildren(
      el('p', {}, `${plan.collectionExists ? 'Updating' : 'Creating'} the “${plan.collection}” collection (modes: ${plan.modes.join(', ')}): ${plan.create.length} new, ${plan.update.length} changed, ${plan.unchanged} unchanged, ${plan.skipped.length} skipped.`),
      [...plan.create, ...plan.update].length ? el('div', {class: 'table-wrap'}, el('table', {}, el('tr', {}, el('th', {}, 'Variable'), el('th', {}, 'Mode'), el('th', {}, 'Now'), el('th', {}, 'After')), [...plan.update, ...plan.create].slice(0, 40).map(row))) : '',
      plan.skipped.length ? el('details', {}, el('summary', {class: 'muted'}, `Skipped (${plan.skipped.length})`), el('ul', {}, plan.skipped.map(s => el('li', {}, `${s.path}: ${s.reason}`)))) : '',
      el('div', {class: 'row'}, apply));
  } catch (error) { out.replaceChildren(el('p', {class: 'error'}, error.message)); }
});

// Application impact: add app code (GitHub or ZIP) as an application source, then scan usage.
let projectOf = null;
function renderUsage(report) {
  const used = report.components.filter(c => c.usages).sort((a, b) => b.usages - a.usages), unused = report.components.filter(c => !c.usages);
  $('#impact-result').replaceChildren(
    el('p', {}, `${used.length} of ${report.components.length} components are used across ${report.filesScanned} files and ${report.screens} screens${report.filesSkipped ? ` (${report.filesSkipped} files skipped: tests, dependencies, docs or too large)` : ''}.`),
    el('div', {class: 'table-wrap'}, el('table', {}, el('tr', {}, el('th', {}, 'Component'), el('th', {}, 'Usages'), el('th', {}, 'Screens'), el('th', {}, 'Props passed'), el('th', {}, 'Example')),
      used.slice(0, 30).map(c => el('tr', {}, el('td', {}, c.component), el('td', {}, String(c.usages)), el('td', {}, String(c.screens.length)),
        el('td', {}, Object.entries(c.propUsages).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([p, n]) => `${p} ×${n}`).join(', ') || '—'),
        el('td', {}, c.examples[0] ? el('code', {}, `${c.examples[0].file}:${c.examples[0].line}`) : '—'))))),
    unused.length ? el('p', {class: 'muted'}, `Not used anywhere in the scanned code: ${unused.map(c => c.component).join(', ')}.`) : '');
}
async function impact() {
  if (!id) return;
  try { projectOf = (await api(`/v1/extractions/${id}?include=full`)).projectId; renderUsage(await api(`/v1/projects/${projectOf}/usage`)); } catch {}
}
$('#impact-form').addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.target, out = $('#impact-result'), repo = form.elements.repo.value.trim(), zip = form.elements.zip.files[0];
  if (!repo && !zip) { out.replaceChildren(el('p', {class: 'error'}, 'Add a public GitHub link or a ZIP of your app.')); return; }
  out.replaceChildren(el('p', {class: 'muted'}, 'Adding your code…'));
  try {
    projectOf ??= (await api(`/v1/extractions/${id}?include=full`)).projectId;
    if (repo) await api(`/v1/projects/${projectOf}/sources`, {method: 'POST', body: JSON.stringify({kind: 'url', uri: repo, role: 'application'})});
    if (zip) {
      const buffer = new Uint8Array(await zip.arrayBuffer()); let binary = '';
      for (let i = 0; i < buffer.length; i += 0x8000) binary += String.fromCharCode(...buffer.subarray(i, i + 0x8000));
      await api(`/v1/projects/${projectOf}/sources`, {method: 'POST', body: JSON.stringify({kind: 'file', name: zip.name.replace(/[^\w .()-]/g, '_'), base64: btoa(binary), role: 'application'})});
    }
    const {events} = await api(`/v1/projects/${projectOf}/usage`, {method: 'POST', body: JSON.stringify({edsId: id})});
    const stream = new EventSource(events);
    stream.addEventListener('progress', e => out.replaceChildren(el('p', {class: 'muted'}, JSON.parse(e.data).body.message)));
    stream.addEventListener('warning', e => out.append(el('p', {class: 'error'}, JSON.parse(e.data).body.message)));
    stream.addEventListener('failed', e => { stream.close(); out.replaceChildren(el('p', {class: 'error'}, JSON.parse(e.data).body.message)); });
    stream.addEventListener('complete', async () => { stream.close(); renderUsage(await api(`/v1/projects/${projectOf}/usage`)); });
    form.reset();
  } catch (error) { out.replaceChildren(el('p', {class: 'error'}, error.message)); }
});
impact();
