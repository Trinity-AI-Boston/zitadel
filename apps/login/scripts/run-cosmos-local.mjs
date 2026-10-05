import { readFile, stat } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const appDir = fileURLToPath(new URL('..', import.meta.url));
const tokenFile = process.env.ZITADEL_SERVICE_USER_TOKEN_FILE || '/private/tmp/cosmos-zitadel-local.pat';
const metadata = await stat(tokenFile);
if (!metadata.isFile() || (metadata.mode & 0o077)) {
  throw new Error('The local Login UI credential must be in an owner-only file.');
}
const token = (await readFile(tokenFile, 'utf8')).trim();
if (!token) throw new Error('The local Login UI credential is empty.');

console.log('Local Cosmos Login UI: http://localhost:3001/ui/v2/login');
console.log('Identity service: https://dev-zitadel.cosmosone.ai (existing dev accounts)');
const child = spawn(process.execPath, [
  path.join(appDir, 'node_modules/next/dist/bin/next'), 'dev', '--webpack',
  '--hostname', '127.0.0.1', '--port', '3001',
], {
  cwd: appDir,
  stdio: 'inherit',
  env: {
    ...process.env,
    ZITADEL_API_URL: 'https://dev-zitadel.cosmosone.ai',
    ZITADEL_SERVICE_USER_TOKEN: token,
    NEXT_PUBLIC_BASE_PATH: '/ui/v2/login',
    CUSTOM_REQUEST_HEADERS: 'Host:dev-zitadel.cosmosone.ai,X-Forwarded-Proto:https,x-zitadel-instance-host:dev-zitadel.cosmosone.ai,x-zitadel-public-host:dev-zitadel.cosmosone.ai',
    CSP_FETCH_ENABLED: 'true',
  },
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => process.exit(code ?? 1));
