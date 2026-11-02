// Shared helpers for the extraction pages. Plain browser JavaScript, no build.
const $ = selector => document.querySelector(selector);
function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === null || value === false) continue;
    if (key === 'class') node.className = value; else if (key === 'style') node.setAttribute('style', value); else if (key.startsWith('on')) node.addEventListener(key.slice(2), value); else node.setAttribute(key, value === true ? '' : value);
  }
  for (const child of children.flat()) if (child !== null && child !== undefined && child !== false) node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  return node;
}
async function api(path, options = {}) {
  const response = await fetch(path, {...options, headers: {'content-type': 'application/json', ...(options.headers || {})}});
  const body = response.status === 204 ? null : await response.json().catch(() => null);
  if (response.status === 401 && !location.pathname.endsWith('/signin.html')) { location.href = '/app/signin.html'; throw new Error('Sign in first.'); }
  if (!response.ok) throw new Error(body?.error || `Request failed (${response.status})`);
  return body;
}
// With accounts on, the header shows who is signed in. `whoami` resolves to the user, or null when accounts are off.
const whoami = (async () => {
  if (location.pathname.endsWith('/signin.html')) return null;
  const me = await fetch('/v1/auth/me').then(r => r.status === 401 ? (location.href = '/app/signin.html', null) : r.json()).catch(() => null);
  const user = me?.user ?? null, header = document.querySelector('header.top');
  if (user && header) header.append(el('div', {class: 'account'}, el('span', {class: 'muted'}, user.email),
    el('button', {type: 'button', onclick: async () => { await fetch('/v1/auth/logout', {method: 'POST'}); location.href = '/app/signin.html'; }}, 'Sign out')));
  return user;
})();
(function theme() {
  try { const saved = localStorage.getItem('gapscan-theme'); if (saved) document.documentElement.dataset.theme = saved; } catch {}
  document.addEventListener('click', event => {
    if (event.target?.id !== 'theme') return;
    const dark = document.documentElement.dataset.theme ? document.documentElement.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.dataset.theme = dark ? 'light' : 'dark';
    try { localStorage.setItem('gapscan-theme', document.documentElement.dataset.theme); } catch {}
  });
})();

// Minimal, safe Markdown → DOM for generated sections: headings, lists, tables,
// fenced code, bold, italic and inline code. Never uses innerHTML.
function inline(text) {
  const out = [], pattern = /(\*\*[^*]+\*\*|`[^`]+`|_[^_]+_|\*[^*]+\*)/g;
  let last = 0, m;
  while ((m = pattern.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const t = m[0];
    out.push(t.startsWith('**') ? el('strong', {}, t.slice(2, -2)) : t.startsWith('`') ? el('code', {}, t.slice(1, -1)) : el('em', {}, t.slice(1, -1)));
    last = pattern.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
function markdown(source) {
  const root = el('div', {class: 'md'}), lines = source.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('```')) { const code = []; while (++i < lines.length && !lines[i].startsWith('```')) code.push(lines[i]); root.append(el('pre', {}, el('code', {}, code.join('\n')))); continue; }
    if (/^#{1,4} /.test(line)) { root.append(el('h4', {}, ...inline(line.replace(/^#+ /, '')))); continue; }
    if (line.startsWith('- ')) { const list = el('ul'); while (i < lines.length && lines[i].startsWith('- ')) list.append(el('li', {}, ...inline(lines[i++].slice(2)))); i--; root.append(list); continue; }
    if (line.startsWith('|')) {
      const rows = []; while (i < lines.length && lines[i].startsWith('|')) rows.push(lines[i++]); i--;
      const cells = row => row.split('|').slice(1, -1).map(c => c.trim());
      const table = el('table', {}, el('tr', {}, cells(rows[0]).map(c => el('th', {}, ...inline(c)))), rows.slice(2).map(r => el('tr', {}, cells(r).map(c => el('td', {}, ...inline(c))))));
      root.append(el('div', {class: 'table-wrap'}, table)); continue;
    }
    if (line.trim()) root.append(el('p', {}, ...inline(line)));
  }
  return root;
}
