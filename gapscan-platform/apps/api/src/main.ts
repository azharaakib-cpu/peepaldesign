import {configFromEnv, createInfra} from '@gapscan/infra';
import {buildApp} from './app.ts';

const infra = await createInfra(configFromEnv());
const app = buildApp({infra, logger: true});
const port = Number(process.env.PORT) || 4300, host = process.env.HOST || '127.0.0.1';

const shutdown = async () => { await app.close(); await infra.close(); process.exit(0); };
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);

await app.listen({port, host});
