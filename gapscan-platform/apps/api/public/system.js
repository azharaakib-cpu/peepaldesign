// The result page: your design system laid out, and three things to do with it.
const id = new URLSearchParams(location.search).get('id');
let projectId = null;

function showName(name) {
  $('#system-name').textContent = name;
  setCrumbs([{label: 'Design systems', href: '/app/'}, {label: name}]);
}
async function load() {
  if (!id) { $('#system-meta').textContent = 'No design system in the link.'; return; }
  try {
    const record = await api(`/v1/extractions/${id}`);
    projectId = record.projectId;
    const project = await api(`/v1/projects/${projectId}`);
    showName(project.name);
    const sources = project.sources.filter(s => s.role !== 'application');
    const latest = [...project.extractions].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    $('#system-meta').textContent = `Read from ${sources.map(s => s.kind === 'url' ? new URL(s.uri).hostname.replace(/^www\./, '') : s.label || s.uri.replace(/^inline:/, '')).join(', ') || 'your sources'} · ${new Date(record.createdAt).toLocaleDateString(undefined, {day: 'numeric', month: 'long', year: 'numeric'})}`;
    if (latest && latest.id !== id) $('#system-meta').append(' · ', el('a', {href: `/app/system.html?id=${latest.id}`}, 'A newer version exists'));
    $('#update').href = `/app/?project=${projectId}`;
  } catch (error) { $('#system-meta').textContent = ''; $('#system-error').textContent = error.message; return; }
  const preview = `/v1/extractions/${id}/design-system.html`;
  $('#preview').src = `${preview}?embed=1`;
  $('#preview-open').href = preview;
  // Until each action gets its own simple view, they open the matching part of the full review.
  $('#action-export').href = `/app/review.html?id=${id}#deliver`;
  $('#action-documents').href = `/app/review.html?id=${id}#documentation`;
  $('#action-migrate').href = `/app/review.html?id=${id}#migrate`;
  api(`/v1/extractions/${id}/recommendations`).then(ranked => {
    if (ranked[0]) $('#migrate-note').textContent = `Closest match: ${ranked[0].library}. See what moving to it takes.`;
  }).catch(() => {});
  api(`/v1/extractions/${id}/objects`).then(list => {
    const pct = Math.round(list.reduce((sum, o) => sum + o.completeness, 0) / Math.max(1, list.length) * 100);
    $('#documents-note').textContent = `${pct}% written today. Generate the rest and download them.`;
  }).catch(() => {});
}

$('#rename').addEventListener('click', () => {
  $('#rename-input').value = $('#system-name').textContent;
  $('#title-show').hidden = true; $('#rename-form').hidden = false; $('#rename-input').select();
});
const closeRename = () => { $('#title-show').hidden = false; $('#rename-form').hidden = true; };
$('#rename-cancel').addEventListener('click', closeRename);
$('#rename-input').addEventListener('keydown', event => { if (event.key === 'Escape') closeRename(); });
$('#rename-form').addEventListener('submit', async event => {
  event.preventDefault();
  try { showName((await api(`/v1/projects/${projectId}`, {method: 'PATCH', body: JSON.stringify({name: $('#rename-input').value})})).name); closeRename(); }
  catch (error) { $('#system-error').textContent = error.message; }
});
load();
