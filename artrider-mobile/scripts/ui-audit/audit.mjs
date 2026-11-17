// Auditoría de UI SOLO de desarrollo (no entra al bundle de la app).
// Abre la vista web (http://localhost:8082 por defecto, o AUDIT_BASE) con Edge headless, a varios
// anchos y en claro/oscuro, y mide con getBoundingClientRect.
//
// Uso:  node scripts/ui-audit/audit.mjs [etiqueta] [rutas separadas por coma] [anchos]
//   p. ej. node scripts/ui-audit/audit.mjs despues . 360,390,430,768
//          node scripts/ui-audit/audit.mjs despues dev-gallery?s=home,dev-gallery?s=lists
// Convención de testID: section, section-header, section-title, section-action, item-card, item-price, chip.
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const BASE = process.env.AUDIT_BASE ?? 'http://localhost:8082';
const [label = 'medicion', routesArg = '.', widthsArg = '360,390,430,768'] = process.argv.slice(2);
const rawRoutes = routesArg.split(',');
const widths = widthsArg.split(',').map(Number);
const outDir = `.ui-audit/${label}`;
mkdirSync(outDir, { recursive: true });

const TOL = 1.5; // px de tolerancia por redondeo del navegador

/** Se ejecuta dentro de la página: devuelve mediciones crudas. */
function measure() {
  const vw = window.innerWidth;
  const q = (sel) => [...document.querySelectorAll(`[data-testid="${sel}"]`)];
  const rect = (el) => {
    const r = el.getBoundingClientRect();
    return { l: r.left, r: r.right, t: r.top + window.scrollY, b: r.bottom + window.scrollY, w: r.width, h: r.height };
  };
  const inHScroll = (el) => {
    for (let p = el.parentElement; p; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if ((cs.overflowX === 'auto' || cs.overflowX === 'scroll') && p.scrollWidth > p.clientWidth + 1) return true;
    }
    return false;
  };
  // Un Switch se mide con el primer contenedor ancestro de ≥ 44pt de alto (la fila táctil).
  const touchBox = (e) => {
    if (e.getAttribute('role') !== 'switch') return e;
    let a = e;
    for (let i = 0; i < 6 && a.parentElement && a.getBoundingClientRect().height < 43.5; i++) a = a.parentElement;
    return a;
  };
  const headers = q('section-header').map((h) => {
    const title = h.querySelector('[data-testid="section-title"]');
    const action = h.querySelector('[data-testid="section-action"]');
    const pr = parseFloat(getComputedStyle(h).paddingRight) || 0; // el margen puede ir como padding del encabezado
    const box = rect(h);
    return { box: { ...box, r: box.r - pr }, title: title ? rect(title) : null, action: action ? rect(action) : null };
  });
  const sections = q('section').map((sec) => {
    const h = sec.querySelector('[data-testid="section-header"]');
    return { ...rect(sec), head: h ? rect(h) : rect(sec) };
  });
  const cards = q('item-card').map((c) => ({ box: rect(c), inScroller: inHScroll(c) }));
  const prices = q('item-price').map(rect);
  const clickable = [...document.querySelectorAll('[role="button"], button, a[href], input, textarea, [role="link"], [role="switch"]')]
    .filter((e) => e.offsetParent !== null || getComputedStyle(e).position === 'fixed')
    // Un Switch se mide con su contenedor táctil (la fila de 44pt), no con el control nativo.
    .map((e) => ({ name: (e.getAttribute('aria-label') || e.textContent || e.tagName).trim().slice(0, 28), ...rect(touchBox(e)), id: e.getAttribute('data-testid') }))
    .filter((e) => e.w > 0 && e.h > 0 && e.l < vw && e.b > 0)
    // Artefacto de la web: la barra de pestañas se dibuja arriba (en teléfono va abajo y es nativa).
    .filter((e) => !(e.t < 80 && ['Home', 'Reservas', 'Mensajes', 'Perfil', 'Hoy', 'Calendario', 'Anuncios', 'Menú'].includes(e.name)));
  const clipped = [...document.querySelectorAll('[dir="auto"]')]
    .map((e) => {
      const cs = getComputedStyle(e);
      const clamp = cs.webkitLineClamp && cs.webkitLineClamp !== 'none';
      const hidden = cs.overflow === 'hidden' || cs.overflowX === 'hidden';
      const ell = cs.textOverflow === 'ellipsis';
      return { text: (e.textContent || '').trim().slice(0, 24), clip: hidden && !clamp && !ell && e.scrollWidth > e.clientWidth + 1, vclip: hidden && !clamp && e.scrollHeight > e.clientHeight + 2 };
    })
    .filter((e) => e.clip || e.vclip);
  // Cualquier elemento visible (fuera de scrollers horizontales) que sobresalga del ancho.
  const offenders = [...document.querySelectorAll('body *')]
    .filter((e) => {
      const r = e.getBoundingClientRect();
      return r.width > 0 && r.right > vw + 1 && !inHScroll(e) && getComputedStyle(e).position !== 'fixed';
    })
    .slice(0, 3)
    .map((e) => e.getAttribute('data-testid') || e.tagName);
  // Márgenes genéricos: bloques anchos que no son a sangre completa (tarjetas, inputs, botones).
  const blocks = [...document.querySelectorAll('body *')]
    .map((e) => ({ e, r: e.getBoundingClientRect() }))
    .filter(({ e, r }) => r.width >= vw * 0.5 && r.width < vw - 1.5 && r.height >= 24 && r.top + window.scrollY > 80 && !inHScroll(e) && getComputedStyle(e).position !== 'fixed');
  const edge = blocks.length ? { l: Math.min(...blocks.map(({ r }) => r.left)), r: vw - Math.max(...blocks.map(({ r }) => r.right)) } : null;
  return { vw, scrollWidth: document.documentElement.scrollWidth, edge, headers, sections, cards, prices, clickable, clipped, offenders };
}

const fmt = (n) => (Math.round(n * 10) / 10).toString();

const EXEMPT_MARGIN = ['/map'];
function evaluate(m, width, route) {
  const rows = [];
  const phone = width < 600;
  const gutterExpected = phone ? 16 : 24;

  // (a) márgenes izquierdo = derecho en los encabezados de sección
  if (m.headers.length) {
    const left = m.headers.map((h) => (h.title ?? h.box).l);
    const right = m.headers.map((h) => m.vw - (h.action ?? h.box).r);
    const l0 = left[0], r0 = right[0];
    const sym = left.every((l) => Math.abs(l - l0) <= TOL) && right.every((r) => Math.abs(r - r0) <= TOL) && Math.abs(l0 - r0) <= TOL;
    const gutterOk = !phone || (Math.abs(l0 - gutterExpected) <= TOL && Math.abs(r0 - gutterExpected) <= TOL);
    rows.push(['a) margen izq = der', sym && gutterOk, `izq ${left.map(fmt).join('/')} · der ${right.map(fmt).join('/')}${phone ? ` (esperado ${gutterExpected})` : ''}`]);
  } else if (EXEMPT_MARGIN.some((r) => route.startsWith(r))) {
    rows.push(['a) margen izq = der', null, 'pantalla a sangre completa (mapa)']);
  } else if (m.edge) {
    const sym = Math.abs(m.edge.l - m.edge.r) <= TOL;
    const gutterOk = !phone || (Math.abs(m.edge.l - gutterExpected) <= TOL && Math.abs(m.edge.r - gutterExpected) <= TOL);
    rows.push(['a) margen izq = der', sym && gutterOk, `izq ${fmt(m.edge.l)} / der ${fmt(m.edge.r)} (bloques)`]);
  } else rows.push(['a) margen izq = der', null, 'sin bloques']);

  // (b) sin desbordamiento horizontal
  rows.push(['b) sin desbordamiento', m.scrollWidth <= width + 1 && m.offenders.length === 0, `scrollWidth ${m.scrollWidth} / ventana ${width}${m.offenders.length ? ' · ' + m.offenders.join(',') : ''}`]);

  // (c) separación vertical entre secciones constante
  if (m.sections.length >= 2) {
    const s = [...m.sections].sort((a, b) => a.t - b.t);
    // Separación = borde superior del encabezado de la siguiente sección − borde inferior de la anterior.
    const gaps = s.slice(1).map((x, i) => x.head.t - s[i].b);
    const ok = gaps.every((g) => Math.abs(g - gaps[0]) <= TOL);
    rows.push(['c) separación entre secciones', ok, gaps.map(fmt).join(' / ')]);
  } else rows.push(['c) separación entre secciones', null, '<2 secciones']);

  // (d) filas de tarjetas: alturas y precios alineados
  if (m.cards.length) {
    const rowsMap = new Map();
    m.cards.forEach((c, i) => {
      const key = Math.round(c.box.t / 4);
      const arr = rowsMap.get(key) ?? [];
      arr.push({ h: c.box.h, price: m.prices[i] ? m.prices[i].t - c.box.t : null });
      rowsMap.set(key, arr);
    });
    let ok = true; const detail = [];
    for (const arr of rowsMap.values()) {
      if (arr.length < 2) continue;
      const hs = arr.map((a) => a.h), ps = arr.map((a) => a.price).filter((p) => p !== null);
      const okH = hs.every((h) => Math.abs(h - hs[0]) <= TOL), okP = ps.every((p) => Math.abs(p - ps[0]) <= TOL);
      ok = ok && okH && okP;
      detail.push(`h ${hs.map(fmt).join('/')} · precio-y ${ps.map(fmt).join('/')}`);
    }
    rows.push(['d) tarjetas alineadas', detail.length ? ok : null, detail.length ? detail.slice(0, 2).join(' | ') : 'sin filas con 2+ tarjetas']);
  } else rows.push(['d) tarjetas alineadas', null, 'sin tarjetas']);

  // (e) objetivos táctiles ≥ 44×44
  const small = m.clickable.filter((c) => c.w < 43.5 || c.h < 43.5).filter((c) => !c.id || c.id !== 'tabbar');
  rows.push(['e) táctiles ≥ 44', small.length === 0, small.length ? `${small.length}: ` + small.slice(0, 3).map((c) => `${c.name} ${fmt(c.w)}×${fmt(c.h)}`).join(', ') : `${m.clickable.length} revisados`]);

  // (f) texto cortado
  rows.push(['f) texto sin cortes', m.clipped.length === 0, m.clipped.length ? m.clipped.slice(0, 3).map((c) => c.text).join(' | ') : 'ok']);
  return rows;
}

const browser = await chromium.launch({ executablePath: EDGE, headless: true });

/** Resuelve @listing/@package/@checkout/@checkoutpkg navegando desde Home (ids públicos reales). */
async function resolveRoutes(list) {
  const found = {};
  if (list.some((r) => r.startsWith('@'))) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 120000 }).catch(() => {});
    await page.waitForTimeout(3000);
    const cards = page.locator('[data-testid="item-card"]');
    const n = await cards.count();
    for (let i = 0; i < n; i++) {
      await cards.nth(i).locator('[role="button"]').first().click().catch(() => {});
      await page.waitForTimeout(1200);
      const p = new URL(page.url()).pathname;
      if (p.startsWith('/listing/') && !found.listing) found.listing = p;
      if (p.startsWith('/package/') && !found.package) found.package = p;
      if (found.listing && found.package) break;
      await page.goBack().catch(() => {});
      await page.waitForTimeout(1500);
    }
    await ctx.close();
  }
  return list.map((r) => {
    if (r === '@listing') return found.listing ?? null;
    if (r === '@package') return found.package ?? null;
    if (r === '@checkout') return found.listing ? found.listing.replace('/listing/', '/checkout/') : null;
    if (r === '@checkoutpkg') return found.package ? found.package.replace('/package/', '/checkout/package/') : null;
    return r === '.' ? '/' : r.startsWith('/') ? r : '/' + r;
  }).filter(Boolean);
}
const routes = await resolveRoutes(rawRoutes);
console.log('rutas:', routes.join(' '));
const summary = [];
for (const route of routes) {
  for (const scheme of ['light', 'dark']) {
    for (const width of widths) {
      const ctx = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: scheme });
      const page = await ctx.newPage();
      await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 120000 }).catch(() => {});
      await page.waitForTimeout(2500);
      const m = await page.evaluate(measure);
      const rows = evaluate(m, width, route);
      const name = route.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'home';
      await page.screenshot({ path: `${outDir}/${name}-${width}-${scheme}.png` });
      summary.push({ route, scheme, width, rows });
      await ctx.close();
    }
  }
}
await browser.close();

let fails = 0, oks = 0;
for (const s of summary) {
  console.log(`\n## ${s.route} · ${s.width}px · ${s.scheme}`);
  for (const [name, ok, val] of s.rows) {
    const tag = ok === null ? '  -  ' : ok ? ' OK  ' : 'FALLA';
    if (ok === true) oks++;
    if (ok === false) fails++;
    console.log(`  [${tag}] ${name.padEnd(30)} ${val}`);
  }
}
console.log(`\nTOTAL: ${oks} OK · ${fails} FALLA`);
writeFileSync(`${outDir}/audit.json`, JSON.stringify(summary, null, 1));
