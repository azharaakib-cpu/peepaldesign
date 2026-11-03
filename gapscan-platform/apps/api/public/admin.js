// Admin: every design system, newest activity first, opening onto the full extraction detail.
let systems = [];
const when = iso => new Date(iso).toLocaleString(undefined, {day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'});
function render() {
  const query = $('#search').value.trim().toLowerCase();
  const rows = systems.filter(s => !query || s.name.toLowerCase().includes(query) || (s.owner ?? '').toLowerCase().includes(query));
  $('#systems').replaceChildren(el('tr', {}, ['Design system', 'Owner', 'Sources', 'Extractions', 'Last activity', ''].map(h => el('th', {}, h))),
    ...rows.map(s => el('tr', {},
      el('td', {}, el('strong', {}, s.name)),
      el('td', {class: 'muted'}, s.owner ?? '—'),
      el('td', {}, String(s.sources)),
      el('td', {}, String(s.extractions)),
      el('td', {class: 'muted'}, when(s.lastActivity)),
      el('td', {}, s.latestExtraction ? el('a', {href: `/app/review.html?id=${s.latestExtraction.id}`}, `Open v${s.latestExtraction.version}`) : el('span', {class: 'muted'}, 'Not extracted')))));
  $('#systems-status').textContent = rows.length ? '' : query ? 'Nothing matches that search.' : 'No design systems yet.';
}
$('#search').addEventListener('input', render);
setCrumbs([{label: 'Admin'}]);
(async () => {
  try {
    systems = await api('/v1/admin/design-systems');
    $('#count-systems').textContent = systems.length || '';
    render();
  } catch (error) {
    $('#systems-status').replaceChildren(error.message === 'Admins only.' ? el('span', {}, 'Admins only. ', el('a', {href: '/app/signin.html'}, 'Sign in as an admin')) : error.message);
  }
})();
