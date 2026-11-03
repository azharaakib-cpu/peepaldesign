// Documents: the six documents of a complete design system, to check, approve and download.
const id = new URLSearchParams(location.search).get('id');
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
if (id) {
  $('#to-pdf').href = `/app/export.html?id=${id}`;
  systemContext(id, 'Documents').catch(error => { $('#lead').textContent = error.message; });
  // A one-line summary over the documents once they load (docs.js renders them).
  api(`/v1/extractions/${id}/objects`).then(list => {
    const ready = list.filter(o => o.sections.every(s => s.approval || s.provenance === 'extracted')).length;
    $('#docs-summary').textContent = `${ready} of ${list.length} documents ready. Approved sections go into your PDF.`;
  }).catch(() => {});
} else $('#lead').textContent = 'No design system in the link.';
