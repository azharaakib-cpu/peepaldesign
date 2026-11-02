// Source intake and live extraction progress.
let projectId = null, sources = [], activeJob = null, stream = null;

async function ensureProject() {
  if (projectId) return projectId;
  const project = await api('/v1/projects', {method: 'POST', body: JSON.stringify({name: 'Extraction ' + new Date().toLocaleString()})});
  return (projectId = project.id);
}
function showError(message) { $('#source-error').textContent = message || ''; }
function renderSources() {
  const list = $('#source-list');
  list.replaceChildren(...(sources.length ? sources.map(s => el('li', {class: 'source'}, el('span', {}, s.label || s.uri), el('span', {class: 'pill'}, s.kind))) : [el('li', {class: 'empty'}, 'Nothing added yet.')]));
  $('#run').disabled = !sources.length || !!activeJob;
}
async function addSource(body) {
  showError('');
  try {
    const id = await ensureProject();
    sources.push(await api(`/v1/projects/${id}/sources`, {method: 'POST', body: JSON.stringify(body)}));
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
    await addSource({kind: 'file', name: file.name.replace(/[^\w .()-]/g, '_'), base64: btoa(binary)});
  }
  $('#files').value = '';
});

function log(line) { const box = $('#log'); box.hidden = false; box.textContent += line + '\n'; box.scrollTop = box.scrollHeight; }
$('#run').addEventListener('click', async () => {
  $('#log').textContent = '';
  try {
    const {jobId, events} = await api(`/v1/projects/${projectId}/extractions`, {method: 'POST'});
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
renderSources();
