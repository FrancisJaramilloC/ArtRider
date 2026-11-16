// Herramienta de DESARROLLO: (re)inicia el servidor web de Expo en un puerto propio para medir.
// Uso: node scripts/ui-audit/serve.mjs [puerto=8091]
// El Metro en Windows a veces no detecta cambios; reiniciar garantiza que se mide el código actual.
import { execSync, spawn } from 'node:child_process';
import { openSync } from 'node:fs';

const port = Number(process.argv[2] ?? 8091);
if (port === 8082) throw new Error('El 8082 es el servidor del usuario: no se toca.');

// Libera SOLO el puerto indicado (el servidor propio anterior).
try {
  const out = execSync('netstat -ano -p tcp', { encoding: 'utf8' });
  const pids = new Set(
    out.split('\n').filter((l) => l.includes(`:${port} `) && l.includes('LISTENING')).map((l) => l.trim().split(/\s+/).pop()),
  );
  for (const pid of pids) if (pid && pid !== '0') execSync(`taskkill /PID ${pid} /F /T`, { stdio: 'ignore' });
} catch {
  /* nada que liberar */
}

const log = openSync('.ui-audit/serve.log', 'w');
const child = spawn('pnpm', ['exec', 'expo', 'start', '--web', '--port', String(port), '--clear'], {
  detached: true,
  stdio: ['ignore', log, log],
  shell: true,
  env: { ...process.env, CI: '1' },
});
child.unref();

const deadline = Date.now() + 180000;
while (Date.now() < deadline) {
  await new Promise((r) => setTimeout(r, 3000));
  try {
    const res = await fetch(`http://localhost:${port}`);
    if (res.status === 200) {
      // Calienta el bundle para que la primera medición no espere a la compilación.
      const html = await res.text();
      const src = html.match(/src="([^"]*bundle[^"]*)"/)?.[1];
      if (src) await fetch(`http://localhost:${port}${src}`).then((r) => r.arrayBuffer());
      console.log(`servidor listo en :${port}`);
      process.exit(0);
    }
  } catch {
    /* aún arrancando */
  }
}
console.error('el servidor no respondió a tiempo');
process.exit(1);
