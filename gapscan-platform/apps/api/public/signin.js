// Magic-link sign-in. The token arrives in the URL fragment (never sent to a server) and is
// exchanged only when the person presses Sign in, so link scanners that open emails can't use it up.
const token = new URLSearchParams(location.hash.slice(1)).get('token');
history.replaceState(null, '', location.pathname);   // keep the token out of history and bookmarks
if (token) { $('#finish').hidden = false; $('#request').hidden = true; }
addEventListener('hashchange', () => location.reload());   // a link opened in a tab already on this page

$('#finish-button').addEventListener('click', async () => {
  $('#finish-button').disabled = true;
  try { await api('/v1/auth/session', {method: 'POST', body: JSON.stringify({token})}); location.replace('/app/'); }
  catch (error) { $('#finish-error').textContent = error.message; $('#request').hidden = false; $('#finish-button').disabled = false; }
});
$('#email-form').addEventListener('submit', async event => {
  event.preventDefault();
  const status = $('#request-status');
  try { status.textContent = (await api('/v1/auth/link', {method: 'POST', body: JSON.stringify({email: $('#email').value})})).message; }
  catch (error) { status.textContent = error.message; }
});
