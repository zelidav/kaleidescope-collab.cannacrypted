// Run the booth on this computer and expose it over https so an iPad can use the camera.
// Uses a free Cloudflare quick tunnel (temporary *.trycloudflare.com URL, no account needed).
//   npm run ipad
import { spawn, spawnSync } from 'node:child_process';
import QRCode from 'qrcode';

const PORT = process.env.PORT || '3000';
const ADMIN_PIN = process.env.ADMIN_PIN || '1234';
const children = [];

function run(cmd, args, opts = {}) {
  const child = spawn(cmd, args, { shell: process.platform === 'win32', ...opts });
  children.push(child);
  return child;
}

function shutdown(code = 0) {
  for (const c of children) c.kill();
  process.exit(code);
}
process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

const hasCloudflared = spawnSync('cloudflared', ['--version'], { shell: process.platform === 'win32' }).status === 0;
const [tCmd, tArgs] = hasCloudflared
  ? ['cloudflared', ['tunnel', '--url', `http://localhost:${PORT}`]]
  : ['npx', ['--yes', 'cloudflared@0.7.3', 'tunnel', '--url', `http://localhost:${PORT}`]];

console.log('Starting the https tunnel (first run downloads cloudflared, ~30s)…');
const tunnel = run(tCmd, tArgs, { stdio: ['ignore', 'pipe', 'pipe'] });

const url = await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('Timed out waiting for the tunnel URL')), 120000);
  const scan = (buf) => {
    const m = String(buf).match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
    if (m) {
      clearTimeout(timer);
      resolve(m[0]);
    }
  };
  tunnel.stdout.on('data', scan);
  tunnel.stderr.on('data', scan);
  tunnel.on('exit', (code) => reject(new Error(`cloudflared exited (${code}). Install it: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/`)));
}).catch((err) => {
  console.error(err.message);
  shutdown(1);
});

console.log('Starting the booth server…');
const server = run('node', ['server/index.js'], {
  stdio: 'inherit',
  env: { ...process.env, PORT, ADMIN_PIN, PUBLIC_BASE_URL: process.env.PUBLIC_BASE_URL || url },
});
server.on('exit', (code) => shutdown(code ?? 0));

// Give the tunnel a moment to register its DNS name before showing the QR.
await new Promise((r) => setTimeout(r, 4000));
console.log(`\n${await QRCode.toString(url, { type: 'terminal', small: true })}`);
console.log(`  📷  Scan with the iPad camera, or open:  ${url}`);
console.log(`  🔐  Admin (phone or laptop):             ${url}/admin   PIN ${ADMIN_PIN}`);
console.log('  This link changes every time you run this. Ctrl+C to stop.\n');
