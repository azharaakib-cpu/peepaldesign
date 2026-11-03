// Source intake and live extraction progress.
let projectId = null, sources = [], activeJob = null, stream = null;

async function ensureProject() {
  if (projectId) return projectId;
  const project = await api('/v1/projects', {method: 'POST', body: JSON.stringify({name: 'Extraction ' + new Date().toLocaleString()})});
  history.replaceState(null, '', `/app/?project=${project.id}`);   // so the project can be reopened from the address bar
  return (projectId = project.id);
}
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
    const id = await ensureProject();
    sources.push(await api(`/v1/projects/${id}/sources`, {method: 'POST', body: JSON.stringify(body)}));
    renderSources();

// ── Accounts: your projects, and the people on the open one ──
const projectParam = new URLSearchParams(location.search).get('project');
function renderMembers(members, role) {
  const owners = members.filter(m => m.role === 'owner').length;
  $('#members').replaceChildren(...members.map(m => el('li', {class: 'source'}, el('span', {}, m.email), el('span', {class: 'pill'}, m.role),
    role === 'owner' && !(m.role === 'owner' && owners === 1) ? el('button', {type: 'button', onclick: async () => {
      try { renderMembers(await api(`/v1/projects/${projectId}/members/${m.userId}`, {method: 'DELETE'}), role); } catch (error) { $('#invite-status').textContent = error.message; }
    }}, 'Remove') : null)));
}
async function openProject(id) {
  const project = await api(`/v1/projects/${id}`);
  projectId = project.id; sources = project.sources; renderSources();
  $('#project-card').hidden = false;
  $('#project-title').textContent = project.name;
  const [latest] = project.extractions;
  $('#project-reviews').replaceChildren(latest ? el('a', {href: `/app/review.html?id=${latest.id}`}, `Open the latest review (version ${latest.version}, ${new Date(latest.createdAt).toLocaleString()})`) : 'No extraction yet. Add sources below and run one.');
  renderMembers(await api(`/v1/projects/${id}/members`), project.role);
  $('#invite').hidden = project.role !== 'owner';
}
$('#invite').addEventListener('submit', async event => {
  event.preventDefault();
  try {
    renderMembers(await api(`/v1/projects/${projectId}/members`, {method: 'POST', body: JSON.stringify({email: $('#invite-email').value, role: $('#invite-role').value})}), 'owner');
    $('#invite-status').textContent = `Invited ${$('#invite-email').value}. They'll get an email.`; $('#invite-email').value = '';
  } catch (error) { $('#invite-status').textContent = error.message; }
});
whoami.then(async user => {
  if (!user) return;
  const projects = await api('/v1/projects');
  $('#projects-card').hidden = !projects.length;
  $('#projects').replaceChildren(...projects.map(p => el('li', {class: 'source'}, el('a', {href: `/app/?project=${p.id}`}, p.name), el('span', {class: 'muted'}, new Date(p.createdAt).toLocaleDateString()))));
  if (projectParam) await openProject(projectParam).catch(error => showError(error.message));
});
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

// ── Accounts: your projects, and the people on the open one ──
const projectParam = new URLSearchParams(location.search).get('project');
function renderMembers(members, role) {
  const owners = members.filter(m => m.role === 'owner').length;
  $('#members').replaceChildren(...members.map(m => el('li', {class: 'source'}, el('span', {}, m.email), el('span', {class: 'pill'}, m.role),
    role === 'owner' && !(m.role === 'owner' && owners === 1) ? el('button', {type: 'button', onclick: async () => {
      try { renderMembers(await api(`/v1/projects/${projectId}/members/${m.userId}`, {method: 'DELETE'}), role); } catch (error) { $('#invite-status').textContent = error.message; }
    }}, 'Remove') : null)));
}
async function openProject(id) {
  const project = await api(`/v1/projects/${id}`);
  projectId = project.id; sources = project.sources; renderSources();
  $('#project-card').hidden = false;
  $('#project-title').textContent = project.name;
  const [latest] = project.extractions;
  $('#project-reviews').replaceChildren(latest ? el('a', {href: `/app/review.html?id=${latest.id}`}, `Open the latest review (version ${latest.version}, ${new Date(latest.createdAt).toLocaleString()})`) : 'No extraction yet. Add sources below and run one.');
  renderMembers(await api(`/v1/projects/${id}/members`), project.role);
  $('#invite').hidden = project.role !== 'owner';
}
$('#invite').addEventListener('submit', async event => {
  event.preventDefault();
  try {
    renderMembers(await api(`/v1/projects/${projectId}/members`, {method: 'POST', body: JSON.stringify({email: $('#invite-email').value, role: $('#invite-role').value})}), 'owner');
    $('#invite-status').textContent = `Invited ${$('#invite-email').value}. They'll get an email.`; $('#invite-email').value = '';
  } catch (error) { $('#invite-status').textContent = error.message; }
});
whoami.then(async user => {
  if (!user) return;
  const projects = await api('/v1/projects');
  $('#projects-card').hidden = !projects.length;
  $('#projects').replaceChildren(...projects.map(p => el('li', {class: 'source'}, el('a', {href: `/app/?project=${p.id}`}, p.name), el('span', {class: 'muted'}, new Date(p.createdAt).toLocaleDateString()))));
  if (projectParam) await openProject(projectParam).catch(error => showError(error.message));
});
      $('#status').replaceChildren(href ? el('a', {href}, text) : text);
      if (href) location.href = href;
    };
    stream.addEventListener('complete', e => finish('Open the review', `/app/review.html?id=${JSON.parse(e.data).body.resultId}`));
    stream.addEventListener('failed', e => finish('Failed: ' + JSON.parse(e.data).body.message));
    stream.addEventListener('cancelled', () => finish('Cancelled.'));
  } catch (error) { $('#status').textContent = error.message; }
});
$('#cancel').addEventListener('click', () => { if (activeJob) api(`/v1/jobs/${activeJob}`, {method: 'DELETE'}).catch(error => { $('#status').textContent = error.message; }); });
renderSources();

// ── Accounts: your projects, and the people on the open one ──
const projectParam = new URLSearchParams(location.search).get('project');
function renderMembers(members, role) {
  const owners = members.filter(m => m.role === 'owner').length;
  $('#members').replaceChildren(...members.map(m => el('li', {class: 'source'}, el('span', {}, m.email), el('span', {class: 'pill'}, m.role),
    role === 'owner' && !(m.role === 'owner' && owners === 1) ? el('button', {type: 'button', onclick: async () => {
      try { renderMembers(await api(`/v1/projects/${projectId}/members/${m.userId}`, {method: 'DELETE'}), role); } catch (error) { $('#invite-status').textContent = error.message; }
    }}, 'Remove') : null)));
}
async function openProject(id) {
  const project = await api(`/v1/projects/${id}`);
  projectId = project.id; sources = project.sources; renderSources();
  $('#project-card').hidden = false;
  $('#project-title').textContent = project.name;
  const [latest] = project.extractions;
  $('#project-reviews').replaceChildren(latest ? el('a', {href: `/app/review.html?id=${latest.id}`}, `Open the latest review (version ${latest.version}, ${new Date(latest.createdAt).toLocaleString()})`) : 'No extraction yet. Add sources below and run one.');
  renderMembers(await api(`/v1/projects/${id}/members`), project.role);
  $('#invite').hidden = project.role !== 'owner';
}
$('#invite').addEventListener('submit', async event => {
  event.preventDefault();
  try {
    renderMembers(await api(`/v1/projects/${projectId}/members`, {method: 'POST', body: JSON.stringify({email: $('#invite-email').value, role: $('#invite-role').value})}), 'owner');
    $('#invite-status').textContent = `Invited ${$('#invite-email').value}. They'll get an email.`; $('#invite-email').value = '';
  } catch (error) { $('#invite-status').textContent = error.message; }
});
whoami.then(async user => {
  if (!user) return;
  const projects = await api('/v1/projects');
  $('#projects-card').hidden = !projects.length;
  $('#projects').replaceChildren(...projects.map(p => el('li', {class: 'source'}, el('a', {href: `/app/?project=${p.id}`}, p.name), el('span', {class: 'muted'}, new Date(p.createdAt).toLocaleDateString()))));
  if (projectParam) await openProject(projectParam).catch(error => showError(error.message));
});
