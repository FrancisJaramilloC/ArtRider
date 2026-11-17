// SOLO DESARROLLO. Lee las credenciales de auditoría de .ui-audit/.env (ignorado por git).
// Nunca imprimir ni registrar lo que devuelve esta función.
import { existsSync, readFileSync } from 'node:fs';

const FILE = '.ui-audit/.env';
const KEYS = ['UI_AUDIT_EMAIL', 'UI_AUDIT_PASSWORD'];

export function loadCreds() {
  if (!existsSync(FILE)) return null;
  const out = {};
  for (const line of readFileSync(FILE, 'utf8').split(/\r?\n/)) {
    const idx = line.indexOf('=');
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim();
    if (!KEYS.includes(key)) continue;
    out[key] = line
      .slice(idx + 1)
      .trim()
      .replace(/^["']|["']$/g, '');
  }
  return out.UI_AUDIT_EMAIL && out.UI_AUDIT_PASSWORD ? out : null;
}
