// Accounts: email magic links, cookie sessions, and per-project access.
// Every API route has an access rule here; a route without one is refused, so a new
// endpoint can't ship open by accident. Tokens and session ids are stored hashed.
import {createHash, randomBytes} from 'node:crypto';
import {z} from 'zod';
import type {FastifyInstance, FastifyReply, FastifyRequest} from 'fastify';
import type {Role, Store, User} from '@gapscan/infra';
import {linkMail} from './mailer.ts';
import type {Mailer} from './mailer.ts';

declare module 'fastify' { interface FastifyRequest { user?: User } }

export type AuthConfig = {mode: 'off'} | {mode: 'magic-link'; publicUrl: URL; mailer: Mailer; allowedDomains: string[]; linkMinutes?: number; sessionDays?: number};

// Hosted deployments must choose explicitly; local mode stays open and zero-config.
export function authSettingsFromEnv(env: NodeJS.ProcessEnv = process.env) {
  const hosted = env.GAPSCAN_STORE === 'postgres';
  const mode = env.GAPSCAN_AUTH || (hosted ? undefined : 'off');
  if (!mode) throw new Error('Hosted mode needs GAPSCAN_AUTH=magic-link (or GAPSCAN_AUTH=off to run without accounts behind your own sign-in).');
  if (mode === 'off') return {mode: 'off' as const};
  if (mode !== 'magic-link') throw new Error('GAPSCAN_AUTH must be magic-link or off.');
  let publicUrl: URL;
  try { publicUrl = new URL(env.GAPSCAN_PUBLIC_URL ?? ''); } catch { throw new Error('GAPSCAN_AUTH=magic-link needs GAPSCAN_PUBLIC_URL, the address people open (https://…).'); }
  if (!/^https?:$/.test(publicUrl.protocol)) throw new Error('GAPSCAN_PUBLIC_URL must be an http(s) address.');
  const mail = (env.GAPSCAN_MAIL || (hosted ? 'smtp' : 'log')) as 'smtp' | 'log';
  if (mail !== 'smtp' && mail !== 'log') throw new Error('GAPSCAN_MAIL must be smtp or log.');
  if (mail === 'log' && hosted) throw new Error('GAPSCAN_MAIL=log would put sign-in links in the server logs; use smtp when hosted.');
  if (mail === 'smtp' && (!env.GAPSCAN_SMTP_URL || !env.GAPSCAN_MAIL_FROM)) throw new Error('GAPSCAN_MAIL=smtp needs GAPSCAN_SMTP_URL and GAPSCAN_MAIL_FROM.');
  const allowedDomains = (env.GAPSCAN_AUTH_DOMAINS ?? '').split(',').map(d => d.trim().toLowerCase()).filter(Boolean);
  return {mode: 'magic-link' as const, publicUrl, mail, smtpUrl: env.GAPSCAN_SMTP_URL, from: env.GAPSCAN_MAIL_FROM, allowedDomains};
}

export const SESSION_COOKIE = 'gapscan_session';
const hash = (token: string) => createHash('sha256').update(token).digest('hex');
const token = () => randomBytes(32).toString('base64url');
const cookieValue = (request: FastifyRequest) => (request.headers.cookie ?? '').split(/;\s*/).find(c => c.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1);

// How each route finds the project it touches. `null` means "no project": public or any signed-in user.
type Rule = {access: 'public' | 'user'} | {access: 'project' | 'owner'; project: (request: FastifyRequest) => Promise<string | null>};
export function accessRules(store: Store): Record<string, Rule> {
  const param = (request: FastifyRequest) => (request.params as {id?: string}).id ?? '';
  const viaProject: Rule = {access: 'project', project: async r => param(r)};
  const viaJob: Rule = {access: 'project', project: async r => (await store.getJob(param(r)))?.projectId ?? null};
  const viaExtraction: Rule = {access: 'project', project: async r => (await store.getExtraction(param(r)))?.projectId ?? null};
  const viaGapScan: Rule = {access: 'project', project: async r => (await store.getGapScan(param(r)))?.projectId ?? null};
  const pub: Rule = {access: 'public'}, user: Rule = {access: 'user'};
  return {
    'GET /health': pub, 'GET /healthz': pub, 'GET /': pub, 'GET /app/*': pub,
    'POST /v1/auth/link': pub, 'POST /v1/auth/session': pub, 'GET /v1/auth/me': pub, 'POST /v1/auth/logout': pub,
    'GET /v1/library': user, 'GET /v1/saved-sites': user, 'GET /v1/library/:id': user, 'GET /v1/templates': user, 'POST /v1/projects': user, 'GET /v1/projects': user,
    'GET /v1/projects/:id': viaProject, 'POST /v1/projects/:id/sources': viaProject, 'POST /v1/projects/:id/extractions': viaProject,
    'POST /v1/projects/:id/usage': viaProject, 'GET /v1/projects/:id/usage': viaProject, 'GET /v1/projects/:id/members': viaProject,
    'POST /v1/projects/:id/members': {access: 'owner', project: async r => param(r)}, 'DELETE /v1/projects/:id/members/:userId': {access: 'owner', project: async r => param(r)},
    'GET /v1/jobs/:id': viaJob, 'DELETE /v1/jobs/:id': viaJob, 'GET /v1/jobs/:id/events': viaJob, 'GET /v1/assets/:id': viaJob, 'GET /v1/assets/:id/file': viaJob,
    'GET /v1/extractions/:id': viaExtraction, 'GET /v1/extractions/:id/scales': viaExtraction, 'GET /v1/extractions/:id/design-system': viaExtraction, 'GET /v1/extractions/:id/design-system.html': viaExtraction, 'GET /v1/extractions/:id/figma-export.json': viaExtraction, 'GET /v1/figma-plugin.zip': user, 'GET /v1/extractions/:id/export': viaExtraction,
    'GET /v1/extractions/:id/objects': viaExtraction, 'PUT /v1/extractions/:id/objects/:kind/sections/:sectionId/approval': viaExtraction,
    'POST /v1/extractions/:id/figma-sync/plan': viaExtraction, 'POST /v1/extractions/:id/figma-sync/apply': viaExtraction, 'GET /v1/extractions/:id/brandkit': viaExtraction,
    'POST /v1/extractions/:id/assets': viaExtraction, 'GET /v1/extractions/:id/recommendations': viaExtraction,
    'POST /v1/gapscans': {access: 'project', project: async r => (await store.getExtraction(String((r.body as {edsId?: unknown} | undefined)?.edsId ?? '')))?.projectId ?? null},
    'GET /v1/gapscans/:id': viaGapScan, 'GET /v1/gapscans/:id/items/:itemId/projection': viaGapScan, 'PUT /v1/gapscans/:id/assumptions': viaGapScan,
    'PUT /v1/gapscans/:id/matches/:sourceId': viaGapScan, 'POST /v1/gapscans/:id/codemod': viaGapScan, 'GET /v1/gapscans/:id/codemod': viaGapScan,
    'GET /v1/gapscans/:id/codemod/rules': viaGapScan, 'GET /v1/gapscans/:id/codemod.mjs': viaGapScan,
  };
}
// Approvals record who approved: with accounts on, that is the signed-in person, not a typed name.
const SIGNED_BY = new Set(['PUT /v1/gapscans/:id/matches/:sourceId', 'PUT /v1/extractions/:id/objects/:kind/sections/:sectionId/approval']);

export function registerAuth(app: FastifyInstance, store: Store, config: AuthConfig, fail: (reply: FastifyReply, status: number, error: string) => FastifyReply) {
  const rules = accessRules(store);
  const routeKey = (request: FastifyRequest) => `${request.method === 'HEAD' ? 'GET' : request.method} ${request.routeOptions.url ?? ''}`;
  // A route added without an access rule stops the server from starting, whatever the auth mode.
  const unruled: string[] = [];
  app.addHook('onRoute', route => {
    for (const method of [route.method].flat()) if (method !== 'HEAD' && !rules[`${method} ${route.url}`]) unruled.push(`${method} ${route.url}`);
  });
  app.addHook('onReady', async () => { if (unruled.length) throw new Error(`Routes without an access rule in auth.ts: ${unruled.join(', ')}`); });

  if (config.mode === 'off') {
    app.get('/v1/auth/me', async () => ({auth: 'off', user: null}));
    return;
  }
  const {publicUrl, mailer, allowedDomains} = config, linkMs = (config.linkMinutes ?? 15) * 60_000, sessionMs = (config.sessionDays ?? 30) * 86_400_000;
  const secure = publicUrl.protocol === 'https:';
  const setCookie = (reply: FastifyReply, value: string, maxAge: number) =>
    reply.header('set-cookie', `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? '; Secure' : ''}`);
  const recentByIp = new Map<string, number[]>();

  app.addHook('preHandler', async (request, reply) => {
    if (!request.routeOptions.url) return;                       // 404s fall through to the not-found handler
    const rule = rules[routeKey(request)];
    if (!rule) return fail(reply, 403, 'This endpoint has no access rule.');
    // Cookies ride along on cross-site requests; a changing request must come from our own pages.
    const origin = request.headers.origin;
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method) && origin && origin !== publicUrl.origin) return fail(reply, 403, 'Cross-site request refused.');
    const raw = cookieValue(request), session = raw ? await store.getSession(hash(raw), new Date().toISOString()) : null;
    const user = session ? await store.getUser(session.userId) : null;
    if (user) request.user = user;
    if (rule.access === 'public') return;
    if (!user) return fail(reply, 401, 'Sign in first.');
    if (!('project' in rule)) return;
    const projectId = await rule.project(request), role = projectId ? await store.roleOf(projectId, user.id) : null;
    // Not a member reads exactly like "doesn't exist", so ids can't be probed.
    if (!role) return fail(reply, 404, 'Not found.');
    if (rule.access === 'owner' && role !== 'owner') return fail(reply, 403, 'Only a project owner can do that.');
    if (SIGNED_BY.has(routeKey(request)) && request.body && typeof request.body === 'object') (request.body as {by?: string}).by = user.email;
  });

  const Email = z.object({email: z.string().trim().toLowerCase().email().max(254)});
  const sent = {message: 'If that address can sign in, a link is on its way. It works once, for 15 minutes.'};
  app.post('/v1/auth/link', async (request, reply) => {
    const body = Email.safeParse(request.body);
    if (!body.success) return fail(reply, 400, 'Enter a valid email address.');
    const {email} = body.data, now = Date.now();
    const recent = (recentByIp.get(request.ip) ?? []).filter(t => t > now - 15 * 60_000);
    if (recent.length >= 20) return fail(reply, 429, 'Too many sign-in requests. Try again in a few minutes.');
    recentByIp.set(request.ip, [...recent, now]);
    // The answer is the same whether or not a link went out, so the form can't reveal who has an account.
    const allowed = !allowedDomains.length || allowedDomains.includes(email.split('@')[1]!) || await store.findUserByEmail(email);
    if (!allowed || await store.countLoginTokens(email, new Date(now - 15 * 60_000).toISOString()) >= 5) return reply.code(202).send(sent);
    const secret = token();
    await store.saveLoginToken({hash: hash(secret), email, expiresAt: new Date(now + linkMs).toISOString(), createdAt: new Date(now).toISOString()});
    // The token travels in the fragment: browsers never send it to a server, so it can't land in access logs.
    const url = new URL('/app/signin.html', publicUrl); url.hash = `token=${secret}`;
    await mailer.send(linkMail(email, 'Your GapScan sign-in link', 'Use this link to sign in to GapScan.', url.href, `It works once and expires in ${Math.round(linkMs / 60_000)} minutes. If you didn't ask for it, ignore this email.`));
    return reply.code(202).send(sent);
  });

  app.post('/v1/auth/session', async (request, reply) => {
    const body = z.object({token: z.string().min(20).max(200)}).safeParse(request.body);
    const email = body.success ? await store.consumeLoginToken(hash(body.data.token), new Date().toISOString()) : null;
    if (!email) return fail(reply, 400, 'This sign-in link has expired or was already used. Ask for a new one.');
    const user = await store.ensureUser(email), secret = token();
    await store.saveSession({hash: hash(secret), userId: user.id, expiresAt: new Date(Date.now() + sessionMs).toISOString(), createdAt: new Date().toISOString()});
    setCookie(reply, secret, Math.round(sessionMs / 1000));
    return {user};
  });
  app.get('/v1/auth/me', async (request, reply) => request.user ? {auth: 'magic-link', user: request.user} : fail(reply, 401, 'Sign in first.'));
  app.post('/v1/auth/logout', async (request, reply) => {
    const raw = cookieValue(request);
    if (raw) await store.deleteSession(hash(raw));
    setCookie(reply, '', 0);
    return reply.code(204).send();
  });

  app.get('/v1/projects', async request => store.listProjectsFor(request.user!.id));
  app.get('/v1/projects/:id/members', async request => store.listMembers((request.params as {id: string}).id));
  app.post('/v1/projects/:id/members', async (request, reply) => {
    const {id} = request.params as {id: string};
    const body = Email.extend({role: z.enum(['owner', 'editor']).default('editor')}).safeParse(request.body);
    if (!body.success) return fail(reply, 400, 'Enter a valid email address.');
    const invitee = await store.ensureUser(body.data.email);
    await store.setMember(id, invitee.id, body.data.role as Role);
    const project = await store.getProject(id);
    await mailer.send(linkMail(invitee.email, `You've been added to ${project?.name ?? 'a project'} on GapScan`,
      `${request.user!.email} added you to “${project?.name ?? 'a project'}” on GapScan. Sign in with this email address to open it.`,
      new URL('/app/signin.html', publicUrl).href, 'No password is needed: GapScan emails you a sign-in link each time.'));
    return reply.code(201).send(await store.listMembers(id));
  });
  app.delete('/v1/projects/:id/members/:userId', async (request, reply) => {
    const {id, userId} = request.params as {id: string; userId: string};
    const members = await store.listMembers(id), leaving = members.find(m => m.userId === userId);
    if (!leaving) return fail(reply, 404, 'Not a member.');
    if (leaving.role === 'owner' && members.filter(m => m.role === 'owner').length === 1) return fail(reply, 400, 'A project needs at least one owner.');
    await store.removeMember(id, userId);
    return store.listMembers(id);
  });
}
