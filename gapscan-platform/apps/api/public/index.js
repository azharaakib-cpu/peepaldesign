// Projects home (no ?project) and one project: its extractions, sources, the extract action and people.
const projectParam = new URLSearchParams(location.search).get('project');
let projectId = null, sources = [], activeJob = null, stream = null;
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const when = iso => new Date(iso).toLocaleString(undefined, {day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'});

// ── Projects home ──
function projectCard(p) {
  const status = p.latestExtraction ? `Extraction v${p.latestExtraction.version}` : p.sources ? 'Ready to extract' : 'No sources yet';
  return el('a', {class: 'project-card', href: `/app/?project=${p.id}`},
    el('span', {class: 'project-name'}, p.name),
    el('span', {class: `pill ${p.latestExtraction ? 'ok' : ''}`}, status),
    el('span', {class: 'muted project-meta'}, `${plural(p.sources, 'source')} · ${plural(p.extractions, 'extraction')} · updated ${when(p.lastActivity)}`));
}
let noProjects = false;   // the empty state has its own New project button
async function showHome() {
  setCrumbs([{label: 'Projects'}]);
  $('#home').hidden = false;
  try {
    const projects = await api('/v1/projects');
    noProjects = !projects.length; $('#new-project').hidden = noProjects;
    $('#projects').replaceChildren(...(projects.length ? projects.map(projectCard) : [el('div', {class: 'empty-state'},
      el('h2', {}, 'Start with your first project'),
      el('p', {class: 'muted'}, 'Add a website, Figma file, brand guide or code. GapScan reads it and lays out the design system it finds, then shows what moving to another system would take.'),
      el('button', {class: 'primary', type: 'button', onclick: openNewProject}, 'New project'))]));
  } catch (error) { $('#projects').replaceChildren(el('p', {class: 'error'}, error.message)); }
}
function openNewProject() {
  $('#new-project-form').hidden = false; $('#new-project').hidden = true;
  $('#new-project-name').focus();
}
function closeNewProject() { $('#new-project-form').hidden = true; $('#new-project').hidden = noProjects; $('#new-project-error').textContent = ''; }
$('#new-project').addEventListener('click', openNewProject);
$('#new-project-cancel').addEventListener('click', closeNewProject);
$('#new-project-form').addEventListener('submit', async event => {
  event.preventDefault();
  try {
    const project = await api('/v1/projects', {method: 'POST', body: JSON.stringify({name: $('#new-project-name').value})});
    location.href = `/app/?project=${project.id}`;
  } catch (error) { $('#new-project-error').textContent = error.message; }
});

// ── One project ──
async function openProject(id) {
  const project = await api(`/v1/projects/${id}`);
  projectId = project.id; sources = project.sources.filter(s => s.role !== 'application');
  $('#project-view').hidden = false;
  showName(project.name);
  const extractions = [...project.extractions].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  $('#project-summary').textContent = `${plural(sources.length, 'source')} · ${extractions.length ? `latest extraction ${when(extractions[0].createdAt)}` : 'not extracted yet'}`;
  $('#versions').replaceChildren(...(extractions.length ? extractions.map((e, i) => el('li', {class: 'source'},
    el('a', {href: `/app/review.html?id=${e.id}`}, `Version ${e.version}`), el('span', {class: 'muted'}, `${when(e.createdAt)}${i === 0 ? ' · latest' : ''}`)))
    : [el('li', {class: 'empty'}, 'No extraction yet. Add sources below, then extract.')]));
  renderSources();
  // Sharing needs accounts: visitors have a private space, so there is no People card for them.
  if (project.role && !(await me).anonymous) {
    $('#project-card').hidden = false;
    renderMembers(await api(`/v1/projects/${id}/members`), project.role);
    $('#invite').hidden = project.role !== 'owner';
  }
}
function showName(name) {
  $('#project-title').textContent = name;
  setCrumbs([{label: 'Projects', href: '/app/'}, {label: name}]);
}
$('#rename').addEventListener('click', () => {
  $('#rename-input').value = $('#project-title').textContent;
  $('#title-show').hidden = true; $('#rename-form').hidden = false;
  $('#rename-input').select();
});
const closeRename = () => { $('#title-show').hidden = false; $('#rename-form').hidden = true; $('#rename-error').textContent = ''; };
$('#rename-cancel').addEventListener('click', closeRename);
$('#rename-input').addEventListener('keydown', event => { if (event.key === 'Escape') closeRename(); });
$('#rename-form').addEventListener('submit', async event => {
  event.preventDefault();
  try { showName((await api(`/v1/projects/${projectId}`, {method: 'PATCH', body: JSON.stringify({name: $('#rename-input').value})})).name); closeRename(); $('#rename').focus(); }
  catch (error) { $('#rename-error').textContent = error.message; }
});

// ── Sources ──
function showError(message) { $('#source-error').textContent = message || ''; }
const KINDS = {url: ['Website', 'web'], figma: ['Figma file', 'figma'], pdf: ['PDF', 'doc'], pptx: ['PowerPoint', 'doc'], docx: ['Word', 'doc'],
  markdown: ['Markdown', 'doc'], code: ['Code', 'code'], zip: ['ZIP archive', 'zip'], image: ['Image', 'image']};
const size = bytes => bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : bytes >= 1024 ? `${Math.round(bytes / 1024)} KB` : `${bytes} bytes`;
const MAX_BYTES = 40 * 1048576;
// Websites read before are saved: say what will be reused and what is left to read.
const savedNotes = new Map();
function savedNote(saved) {
  if (!saved) return null;
  const date = new Date(saved.startedAt).toLocaleDateString();
  if (saved.stale) return `Saved on ${date}, but older than the reuse limit: it will be read again.`;
  return `Saved: ${saved.pages} page${saved.pages === 1 ? '' : 's'} read on ${date}` + (saved.full ? '. The next extraction reuses them without reading the site again.'
    : saved.queued ? `. The next extraction reuses them and continues with up to ${Math.min(8, saved.limit - saved.pages)} more of the ${saved.queued} pages not read yet.` : '. The next extraction reuses them.');
}
async function loadSavedNote(source) {
  if (source.kind !== 'url' || savedNotes.has(source.uri)) return;
  savedNotes.set(source.uri, null);
  try { const {saved} = await api(`/v1/saved-sites?url=${encodeURIComponent(source.uri)}`); savedNotes.set(source.uri, savedNote(saved)); renderSources(); } catch {}
}
// Uploads in flight and ones that failed, shown in the list until they finish or are dismissed.
const pending = [];
function sourceCard(s) {
  const [kindLabel, icon] = KINDS[s.kind] ?? [s.kind, 'doc'];
  const title = s.kind === 'url' ? new URL(s.uri).host + new URL(s.uri).pathname.replace(/\/$/, '') : s.label || s.uri.replace(/^inline:/, '');
  const detail = s.kind === 'url' || s.kind === 'figma' ? s.uri : `${kindLabel} · ${size(s.bytes)}`;
  return el('li', {class: 'source-card'}, el('span', {class: `kind-icon kind-${icon}`, 'aria-hidden': 'true'}),
    el('span', {class: 'source-text'}, el('span', {class: 'source-title', title: s.label || s.uri}, title), el('span', {class: 'muted source-detail'}, detail),
      savedNotes.get(s.uri) ? el('span', {class: 'muted saved'}, savedNotes.get(s.uri)) : null),
    el('span', {class: 'pill'}, kindLabel));
}
function pendingCard(item) {
  return el('li', {class: `source-card ${item.error ? 'is-error' : 'is-busy'}`}, el('span', {class: `kind-icon ${item.error ? 'kind-error' : 'kind-busy'}`, 'aria-hidden': 'true'}),
    el('span', {class: 'source-text'}, el('span', {class: 'source-title'}, item.name), el('span', {class: item.error ? 'error source-detail' : 'muted source-detail'}, item.error || 'Adding…')),
    item.error ? el('button', {type: 'button', class: 'quiet', 'aria-label': `Dismiss ${item.name}`, onclick: () => { pending.splice(pending.indexOf(item), 1); renderSources(); }}, 'Dismiss') : null);
}
function renderSources() {
  $('#source-list').replaceChildren(...sources.map(sourceCard), ...pending.map(pendingCard));
  $('#source-count').textContent = sources.length ? plural(sources.length, 'source') : '';
  const busy = pending.some(p => !p.error);
  $('#run').disabled = !sources.length || !!activeJob || busy;
  $('#extract-ready').textContent = busy ? 'Waiting for sources to finish adding…' : sources.length
    ? `Ready to read ${plural(sources.length, 'source')}. Websites take longest: each page is rendered at three widths.`
    : 'Add at least one source to extract.';
  $('#refresh-row').hidden = ![...savedNotes.values()].some(Boolean);
  sources.forEach(loadSavedNote);
}
// Adds one source, showing it as "Adding…" until the server has it; a failure stays in the list with its reason.
async function addSource(body, name) {
  showError('');
  const item = {name}; pending.push(item); renderSources();
  try {
    sources.push(await api(`/v1/projects/${projectId}/sources`, {method: 'POST', body: JSON.stringify(body)}));
    pending.splice(pending.indexOf(item), 1);
    renderSources();
    return true;
  } catch (error) { item.error = error.message; renderSources(); return false; }
}
async function addFiles(files) {
  for (const file of files) {
    const name = file.name.replace(/[^\w .()@-]/g, '_');
    if (file.size > MAX_BYTES) { pending.push({name, error: `${size(file.size)} is over the 40 MB limit.`}); renderSources(); continue; }
    const buffer = new Uint8Array(await file.arrayBuffer());
    let binary = ''; for (let i = 0; i < buffer.length; i += 0x8000) binary += String.fromCharCode(...buffer.subarray(i, i + 0x8000));
    await addSource({kind: 'file', name, base64: btoa(binary)}, name);
  }
}
$('#files').addEventListener('change', async () => { const files = [...$('#files').files]; $('#files').value = ''; await addFiles(files); });
const zone = $('#dropzone');
for (const type of ['dragenter', 'dragover']) zone.addEventListener(type, event => { event.preventDefault(); zone.classList.add('is-over'); });
for (const type of ['dragleave', 'dragend']) zone.addEventListener(type, () => zone.classList.remove('is-over'));
zone.addEventListener('drop', event => { event.preventDefault(); zone.classList.remove('is-over'); addFiles([...event.dataTransfer.files]); });
// A file dropped beside the zone would otherwise open in the tab and lose the page.
addEventListener('dragover', event => event.preventDefault());
addEventListener('drop', event => event.preventDefault());

const withScheme = uri => /^[a-z]+:\/\//i.test(uri) ? uri : `https://${uri}`;   // "acme.com" means the site
const isFigma = uri => { try { return /(^|\.)figma\.com$/.test(new URL(withScheme(uri)).hostname); } catch { return false; } };
$('#url').addEventListener('input', () => {
  $('#url-hint').textContent = isFigma($('#url').value.trim()) ? 'Figma file: variables, styles and components are read through the Figma API.'
    : 'Websites are rendered in a sandboxed browser at desktop, tablet and phone widths, plus dark mode.';
});
$('#link-form').addEventListener('submit', async event => {
  event.preventDefault();
  const typed = $('#url').value.trim();
  if (!typed) return $('#url').focus();
  const uri = withScheme(typed);
  if (await addSource({kind: 'url', uri, consent: true}, uri)) { $('#url').value = ''; $('#url').dispatchEvent(new Event('input')); }
});
$('#add-code').addEventListener('click', async () => {
  const content = $('#code').value, name = $('#code-name').value.trim() || 'styles.css';
  if (!content.trim()) return $('#code').focus();
  if (await addSource({kind: 'code', name, content}, name)) { $('#code').value = ''; $('#paste').open = false; }
});

// ── Extract: named steps from the job's progress events, the raw log behind "Details" ──
const STEPS = [['collect', 'Reading sources'], ['parse', 'Finding components'], ['normalize', 'Measuring tokens and scales'], ['audit', 'Checking for issues'], ['done', 'Opening your review']];
let stepState = {};
function renderSteps(active, detail, done = 0, total = 0) {
  const reached = STEPS.findIndex(([id]) => id === active);
  $('#steps').replaceChildren(...STEPS.map(([id, label], i) => {
    const state = i < reached ? 'done' : i === reached ? 'active' : 'todo';
    return el('li', {class: `step is-${state}`, ...(state === 'active' ? {'aria-current': 'step'} : {})},
      el('span', {class: 'step-dot', 'aria-hidden': 'true'}),
      el('span', {class: 'step-text'}, el('span', {class: 'step-label'}, label, id === 'collect' && total ? ` (${Math.min(done, total)} of ${total})` : ''),
        state === 'active' && detail ? el('span', {class: 'muted step-detail'}, detail) : null,
        state === 'active' && id === 'collect' && total ? el('span', {class: 'bar-track'}, el('i', {style: `width:${Math.round(done / total * 100)}%`})) : null));
  }));
}
function log(line) { const box = $('#log'); $('#log-details').hidden = false; box.textContent += line + '\n'; box.scrollTop = box.scrollHeight; }
function setMode(mode) {
  $('#extract-idle').hidden = mode !== 'idle';
  $('#extract-running').hidden = mode !== 'running';
  $('#extract-failed').hidden = mode !== 'failed';
}
async function runExtraction() {
  $('#log').textContent = ''; $('#status').textContent = ''; stepState = {warnings: 0};
  try {
    const {jobId, events} = await api(`/v1/projects/${projectId}/extractions`, {method: 'POST', body: JSON.stringify({refresh: $('#refresh').checked})});
    activeJob = jobId; renderSources(); setMode('running'); renderSteps('collect', 'Starting…');
    $('#extract-panel').scrollIntoView({behavior: 'smooth', block: 'nearest'});
    stream = new EventSource(events);
    stream.addEventListener('progress', e => { const {body} = JSON.parse(e.data); log(body.message); renderSteps(body.stage, body.message, body.done, body.total); });
    stream.addEventListener('warning', e => { const message = JSON.parse(e.data).body.message; log('⚠ ' + message); stepState.warnings++; $('#status').textContent = `${plural(stepState.warnings, 'warning')}: see Details.`; });
    const finish = () => { stream.close(); activeJob = null; renderSources(); };
    stream.addEventListener('complete', e => { finish(); renderSteps('done', 'Done.'); location.href = `/app/review.html?id=${JSON.parse(e.data).body.resultId}`; });
    stream.addEventListener('failed', e => { finish(); fail('The extraction stopped', JSON.parse(e.data).body.message); });
    stream.addEventListener('cancelled', () => { finish(); setMode('idle'); $('#extract-ready').textContent = 'Extraction cancelled. Pages already read from websites are kept for next time.'; });
  } catch (error) { activeJob = null; renderSources(); fail('The extraction couldn’t start', error.message); }
}
function fail(title, message) { setMode('failed'); $('#failed-title').textContent = title; $('#failed-message').textContent = message; }
$('#run').addEventListener('click', runExtraction);
$('#retry').addEventListener('click', runExtraction);
$('#cancel').addEventListener('click', () => {
  if (!activeJob) return;
  $('#cancel').disabled = true; $('#status').textContent = 'Cancelling…';
  api(`/v1/jobs/${activeJob}`, {method: 'DELETE'}).catch(error => { $('#status').textContent = error.message; }).finally(() => { $('#cancel').disabled = false; });
});

// ── People (accounts on) ──
function renderMembers(members, role) {
  const owners = members.filter(m => m.role === 'owner').length;
  $('#members').replaceChildren(...members.map(m => el('li', {class: 'source'}, el('span', {}, m.email), el('span', {class: 'pill'}, m.role),
    role === 'owner' && !(m.role === 'owner' && owners === 1) ? el('button', {type: 'button', onclick: async () => {
      try { renderMembers(await api(`/v1/projects/${projectId}/members/${m.userId}`, {method: 'DELETE'}), role); } catch (error) { $('#invite-status').textContent = error.message; }
    }}, 'Remove') : null)));
}
$('#invite').addEventListener('submit', async event => {
  event.preventDefault();
  try {
    renderMembers(await api(`/v1/projects/${projectId}/members`, {method: 'POST', body: JSON.stringify({email: $('#invite-email').value, role: $('#invite-role').value})}), 'owner');
    $('#invite-status').textContent = `Invited ${$('#invite-email').value}. They'll get an email.`; $('#invite-email').value = '';
  } catch (error) { $('#invite-status').textContent = error.message; }
});

// Wait for the sign-in check so a signed-out visitor goes straight to the sign-in page.
whoami.then(() => projectParam ? openProject(projectParam).catch(error => {
  setCrumbs([{label: 'Projects', href: '/app/'}, {label: 'Not found'}]);
  $('#project-view').hidden = false; $('#project-title').textContent = 'Project not found'; $('#rename').hidden = true;
  $('#project-summary').textContent = `${error.message} It may have been removed, or you may not be a member.`;
  document.querySelectorAll('#project-view section').forEach(s => { s.hidden = true; });
}) : showHome());
