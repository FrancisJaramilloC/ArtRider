// Herramienta de DESARROLLO: captura una URL de la vista web a varios anchos y esquemas.
// Uso: node scripts/ui-audit/shoot.mjs <ruta> <etiqueta> [anchos separados por coma]
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const BASE = process.env.AUDIT_BASE ?? 'http://localhost:8082';
const [routeArg = '.', label = 'shot', widthsArg = '390'] = process.argv.slice(2);
// En Git Bash «/» se convierte en una ruta de Windows: «.» significa la raíz.
const route = routeArg === '.' ? '/' : routeArg.startsWith('/') ? routeArg : '/' + routeArg;
const outDir = process.env.AUDIT_OUT ?? '.ui-audit/antes';
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ executablePath: EDGE, headless: true });
for (const scheme of ['light', 'dark']) {
  for (const width of widthsArg.split(',').map(Number)) {
    const ctx = await browser.newContext({ viewport: { width, height: 844 }, colorScheme: scheme, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 200)));
    await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 120000 }).catch((e) => errors.push('goto: ' + e.message));
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${outDir}/${label}-${width}-${scheme}.png`, fullPage: false });
    console.log(`${label} ${width} ${scheme}: ${errors.length ? 'ERRORES ' + errors.slice(0, 3).join(' | ') : 'sin errores de consola'}`);
    await ctx.close();
  }
}
await browser.close();
