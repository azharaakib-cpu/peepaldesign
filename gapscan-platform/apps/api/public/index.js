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
  if (project.role) {
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
function renderSources() {
  const list = $('#source-list');
  list.replaceChildren(...(sources.length ? sources.map(s => el('li', {class: 'source'}, el('span', {}, s.label || s.uri, savedNotes.get(s.uri) ? el('span', {class: 'muted saved'}, savedNotes.get(s.uri)) : null), el('span', {class: 'pill'}, s.kind))) : [el('li', {class: 'empty'}, 'Nothing added yet.')]));
  $('#run').disabled = !sources.length || !!activeJob;
  $('#refresh-row').hidden = ![...savedNotes.values()].some(Boolean);
  sources.forEach(loadSavedNote);
}
async function addSource(body) {
  showError('');
  try {
    sources.push(await api(`/v1/projects/${projectId}/sources`, {method: 'POST', body: JSON.stringify(body)}));
    renderSources();
  } catch (error) { showError(error.message); }
}
document.querySelectorAll('[role="tab"]').forEach(tab => tab.addEventListener('click', () => {
  document.querySelectorAll('[role="tab"]').forEach(t => t.setAttribute('aria-selected', String(t === tab)));
  document.querySelectorAll('[data-panel]').forEach(panel => { panel.hidden = panel.dataset.panel !== tab.dataset.tab; });
}));
$('#add-url').addEventListener('click', async () => { const uri = $('#url').value.trim(); if (uri) { await addSource({kind: 'url', uri, consent: true}); $('#url').value = ''; } });
$('#add-code').addEventListener('click', async () => { const content = $('#code').value; if (content.trim()) { await addSource({kind: 'code', name: $('#code-name').value.trim() || 'styles.css', content}); $('#code').value = ''; } });
$('#add-files').addEventListener('click', async () => {
  for (const file of $('#files').files) {
    const buffer = new Uint8Array(await file.arrayBuffer());
    let binary = ''; for (let i = 0; i < buffer.length; i += 0x8000) binary += String.fromCharCode(...buffer.subarray(i, i + 0x8000));
    await addSource({kind: 'file', name: file.name.replace(/[^\w .()@-]/g, '_'), base64: btoa(binary)});
  }
  $('#files').value = '';
});

// ── Extract ──
function log(line) { const box = $('#log'); box.hidden = false; box.textContent += line + '\n'; box.scrollTop = box.scrollHeight; }
$('#run').addEventListener('click', async () => {
  $('#log').textContent = '';
  try {
    const {jobId, events} = await api(`/v1/projects/${projectId}/extractions`, {method: 'POST', body: JSON.stringify({refresh: $('#refresh').checked})});
    activeJob = jobId; renderSources(); $('#cancel').hidden = false; $('#status').textContent = 'Running…';
    stream = new EventSource(events);
    stream.addEventListener('progress', e => { const {body} = JSON.parse(e.data); log(body.message); });
    stream.addEventListener('warning', e => log('⚠ ' + JSON.parse(e.data).body.message));
    const finish = (text, href) => {
      stream.close(); activeJob = null; $('#cancel').hidden = true; renderSources();
      $('#status').replaceChildren(href ? el('a', {href}, text) : text);
      if (href) location.href = href;
    };
    stream.addEventListener('complete', e => finish('Open the review', `/app/review.html?id=${JSON.parse(e.data).body.resultId}`));
    stream.addEventListener('failed', e => finish('Failed: ' + JSON.parse(e.data).body.message));
    stream.addEventListener('cancelled', () => finish('Cancelled.'));
  } catch (error) { $('#status').textContent = error.message; }
});
$('#cancel').addEventListener('click', () => { if (activeJob) api(`/v1/jobs/${activeJob}`, {method: 'DELETE'}).catch(error => { $('#status').textContent = error.message; }); });

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
