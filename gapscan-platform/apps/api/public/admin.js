// Admin: every design system, recent activity, the reference library and how this GapScan is set up.
const when = iso => new Date(iso).toLocaleString(undefined, {day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'});
let systems = [], activity = [];

// Tabs, with the address keeping the tab (#activity) like the other tabbed pages.
const VIEWS = ['systems', 'activity', 'library', 'settings'], tabs = [...document.querySelectorAll('.page-tabs [role="tab"]')];
function showView(view) {
  if (!VIEWS.includes(view)) view = 'systems';
  tabs.forEach(t => { const on = t.dataset.view === view; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; });
  VIEWS.forEach(v => { $(`#view-${v}`).hidden = v !== view; });
  history.replaceState(null, '', view === 'systems' ? location.pathname : `#${view}`);
}
tabs.forEach((tab, i) => {
  tab.addEventListener('click', () => showView(tab.dataset.view));
  tab.addEventListener('keydown', event => {
    const step = {ArrowRight: 1, ArrowLeft: -1}[event.key];
    if (step) { event.preventDefault(); const next = tabs[(i + step + tabs.length) % tabs.length]; showView(next.dataset.view); next.focus(); }
  });
});
showView(location.hash.slice(1));

function renderSystems() {
  const query = $('#search').value.trim().toLowerCase();
  const rows = systems.filter(s => !query || s.name.toLowerCase().includes(query) || (s.owner ?? '').toLowerCase().includes(query));
  $('#systems').replaceChildren(el('tr', {}, ['Design system', 'Owner', 'Sources', 'Extractions', 'Last activity', ''].map(h => el('th', {}, h))),
    ...rows.map(s => el('tr', {},
      el('td', {}, el('strong', {}, s.name)),
      el('td', {class: 'muted'}, s.owner ?? '—'),
      el('td', {}, String(s.sources)),
      el('td', {}, String(s.extractions)),
      el('td', {class: 'muted'}, when(s.lastActivity)),
      el('td', {}, s.latestExtraction ? el('span', {class: 'row'}, el('a', {href: `/app/review.html?id=${s.latestExtraction.id}`}, 'Full detail'), el('a', {href: `/app/system.html?id=${s.latestExtraction.id}`}, 'As the user sees it'))
        : el('a', {href: `/app/?project=${s.id}`}, 'Sources')))));
  $('#systems-status').textContent = rows.length ? '' : query ? 'Nothing matches that search.' : 'No design systems yet.';
}
function renderActivity() {
  const rows = $('#failed-only').checked ? activity.filter(a => a.status === 'failed') : activity;
  const STATUS = {completed: 'ok', failed: 'major', cancelled: '', queued: 'minor', running: 'minor'};
  $('#activity').replaceChildren(el('tr', {}, ['When', 'What', 'Design system', 'Status', 'Detail'].map(h => el('th', {}, h))),
    ...(rows.length ? rows.map(a => el('tr', {},
      el('td', {class: 'muted'}, when(a.createdAt)), el('td', {}, a.label), el('td', {}, a.project ?? '—'),
      el('td', {}, el('span', {class: `pill ${STATUS[a.status] ?? ''}`}, a.status)),
      el('td', {class: 'wrap'}, a.error ?? (a.type === 'extract' && a.resultId ? el('a', {href: `/app/review.html?id=${a.resultId}`}, 'Open') : a.type === 'gapscan' && a.resultId ? el('a', {href: `/app/gapscan.html?id=${a.resultId}`}, 'Open report') : ''))))
      : [el('tr', {}, el('td', {colspan: 5, class: 'muted'}, 'Nothing here.'))]));
}
function renderSettings(settings) {
  const row = (term, value) => [el('dt', {}, term), el('dd', {}, value)];
  $('#settings').replaceChildren(
    ...row('Accounts', settings.accounts),
    ...row('Admins', settings.admins.length ? settings.admins.join(', ') : 'None'),
    ...row('Sign-in', settings.signIn.length ? settings.signIn.join(', ') : '—'),
    ...row('Drafting with Claude', settings.drafting.enabled ? `On: ${settings.drafting.model}, ${settings.drafting.effort} effort` : 'Off (set GAPSCAN_AI=claude)'),
    ...row('Figma token', settings.figmaToken ? 'Set: Figma links are read, and admins can sync variables' : 'Not set: Figma links are recorded but not read'));
  $('#library').replaceChildren(el('tr', {}, ['Design system', 'Version', 'Built for', 'Components', 'Pinned'].map(h => el('th', {}, h))),
    ...settings.references.map(r => el('tr', {}, el('td', {}, el('strong', {}, r.library)), el('td', {}, r.version), el('td', {}, r.framework), el('td', {}, String(r.components)), el('td', {class: 'muted'}, new Date(r.pinnedAt).toLocaleDateString()))));
}
$('#search').addEventListener('input', renderSystems);
$('#failed-only').addEventListener('change', renderActivity);
setCrumbs([{label: 'Admin'}]);
(async () => {
  try {
    [systems, activity] = await Promise.all([api('/v1/admin/design-systems'), api('/v1/admin/activity')]);
    $('#count-systems').textContent = systems.length || '';
    const failed = activity.filter(a => a.status === 'failed').length;
    $('#count-failed').textContent = failed ? `${failed} failed` : '';
    renderSystems(); renderActivity();
    renderSettings(await api('/v1/admin/settings'));
  } catch (error) {
    $('#systems-status').replaceChildren(error.message === 'Admins only.' ? el('span', {}, 'Admins only. ', el('a', {href: '/app/signin.html'}, 'Sign in as an admin')) : error.message);
  }
})();
