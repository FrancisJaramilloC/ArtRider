// Pruebas de la calidad de datos de equipos (marca, modelo, título, especificaciones). Ejecutar: pnpm test:listing
import assert from 'node:assert/strict';

import { buildSpecs, SPEC_SCHEMA_VERSION, specDisplayItems, specQuality, specsToForm, typeLabelFor } from '../src/constants/listingSpecs.ts';
import { brandKey, canonicalBrands, normalizeBrand, suggestBrands, suggestTitle, validateBrand, validateModel, validateTitle } from '../src/utils/listingData.ts';

let checks = 0;
function eq<T>(actual: T, expected: T, label: string) {
  assert.deepEqual(actual, expected, label);
  checks += 1;
}
const ok = (v: string | null, label: string) => eq(v, null, label);
const bad = (v: string | null, label: string) => {
  assert.ok(typeof v === 'string' && v.length > 0, label);
  checks += 1;
};

// ── Normalización de marca ────────────────────────────────────────────
eq(brandKey('  SONIC '), brandKey('sonic'), 'misma clave sin importar mayúsculas ni espacios');
eq(brandKey('Sónic'), 'sonic', 'sin acentos');
eq(normalizeBrand('  sonic   audio '), 'Sonic Audio', 'minúsculas → Primera Mayúscula por palabra, sin espacios de más');
eq(normalizeBrand('SONIC'), 'Sonic', 'MAYÚSCULAS → Primera Mayúscula');
eq(normalizeBrand('JBL'), 'JBL', 'sigla corta en mayúsculas se conserva');
eq(normalizeBrand('DJ TECH'), 'DJ Tech', 'sigla corta + palabra');
eq(normalizeBrand('Pioneer DJ'), 'Pioneer DJ', 'mezcla de mayúsculas y minúsculas se respeta');
eq(normalizeBrand('   '), '', 'vacío');
eq(normalizeBrand('sonic', ['Sonic']), 'Sonic', 'usa la escritura ya existente');
eq(normalizeBrand('SONIC', ['Sonic', 'JBL']), 'Sonic', 'SONIC y sonic son una sola marca');
eq(normalizeBrand('Sonic', ['SONIC']), 'SONIC', 'si ya existe en la base se respeta su escritura');
eq(new Set(['Sonic', 'SONIC', 'sonic', ' sonic '].map((b) => normalizeBrand(b))).size, 1, '«Sonic», «SONIC» y «sonic» → una sola marca');

eq(canonicalBrands(['Sonic', 'Sonic', 'SONIC', 'jbl', 'JBL', 'JBL', null, '', '  ']), ['JBL', 'Sonic'], 'agrupa variantes y deja la más usada');
eq(canonicalBrands(['sonic', 'Sonic']), ['Sonic'], 'empate → la que mezcla mayúsculas y minúsculas');
eq(suggestBrands('so', ['Sonic', 'Sony', 'JBL', 'Kenwood Sound']), ['Sonic', 'Sony', 'Kenwood Sound'], 'sugiere por coincidencia, las que empiezan igual primero');
eq(suggestBrands('SONIC', ['Sonic']), [], 'sin sugerencia si ya coincide exacto');
eq(suggestBrands('', ['Sonic']), [], 'sin texto, sin sugerencias');

// ── Validación de marca y modelo ──────────────────────────────────────
ok(validateBrand('Sonic', 'Sonic U-IP-P180/4 · Reflector LED'), 'marca válida');
bad(validateBrand('', 'x'), 'marca obligatoria');
bad(validateBrand('Reflector LED exterior de alta potencia Sonic', 'otro'), 'marca de más de 30 caracteres');
bad(validateBrand('Bocina JBL PartyBox 300', 'bocina jbl partybox  300'), 'marca igual al título');
ok(validateBrand('a'.repeat(30), 'otro'), 'marca de exactamente 30');
ok(validateModel('U-IP-P180/4'), 'modelo válido');
bad(validateModel('  '), 'modelo obligatorio');
bad(validateModel('m'.repeat(41)), 'modelo de más de 40 caracteres');
ok(validateModel('m'.repeat(40)), 'modelo de exactamente 40');

// ── Validación del título ─────────────────────────────────────────────
const MODEL = 'U-IP-P180/4';
ok(validateTitle('Sonic U-IP-P180/4 · Reflector LED exterior', MODEL), 'título del ejemplo');
bad(validateTitle('Sonic U-IP', 'U-IP'), 'menos de 12 caracteres');
bad(validateTitle('x'.repeat(61), ''), 'más de 60 caracteres');
ok(validateTitle('x'.repeat(60), ''), 'exactamente 60');
bad(validateTitle('SONIC U-IP-P180/4 REFLECTOR LED', MODEL), 'TODO EN MAYÚSCULAS');
bad(validateTitle('Sonic U-IP-P180/4 Reflector 😀', MODEL), 'emojis');
bad(validateTitle('Sonic U-IP-P180/4 llama 0991234567', MODEL), 'teléfono (10 dígitos)');
bad(validateTitle('Sonic U-IP-P180/4 llama 099 123 4567', MODEL), 'teléfono con espacios');
ok(validateTitle('Sonic U-IP-P180/4 · Reflector 4K', MODEL), 'un modelo con pocos dígitos no es teléfono');
bad(validateTitle('Sonic U-IP-P180/4 solo $50 por día', MODEL), 'precio con $');
bad(validateTitle('Sonic U-IP-P180/4 50 USD el día', MODEL), 'precio en USD');
bad(validateTitle('Sonic U-IP-P180/4 en oferta ahora', MODEL), 'oferta');
bad(validateTitle('Reflector LED exterior profesional', MODEL), 'no contiene el modelo');
ok(validateTitle('Reflector u-ip-p180/4 exterior', MODEL), 'el modelo se busca sin importar mayúsculas');
ok(validateTitle('Reflector LED exterior profesional', ''), 'sin modelo aún no se exige');

// ── Título sugerido ───────────────────────────────────────────────────
eq(suggestTitle('Sonic', 'U-IP-P180/4', 'Reflector LED'), 'Sonic U-IP-P180/4 · Reflector LED', 'Marca Modelo · tipo');
eq(suggestTitle('Sonic', 'U-IP-P180/4', ''), 'Sonic U-IP-P180/4', 'sin tipo');
eq(suggestTitle('Sonic', 'Sonic X1', 'Altavoz activo'), 'Sonic X1 · Altavoz activo', 'no repite la marca si el modelo ya la trae');
eq(suggestTitle('', 'X1 Pro', 'Altavoz activo'), 'X1 Pro · Altavoz activo', 'sin marca');
eq(suggestTitle('Sonic', '', 'Altavoz'), '', 'sin modelo no hay sugerencia');
eq(suggestTitle('Sonic Audio Pro', 'M'.repeat(40), 'Equipo de audio').length <= 60, true, 'nunca pasa de 60');
eq(suggestTitle('A'.repeat(30), 'M'.repeat(40), 'Equipo').includes('M'.repeat(40)), true, 'el modelo siempre se conserva');
ok(validateTitle(suggestTitle('Sonic', 'U-IP-P180/4', 'Reflector'), 'U-IP-P180/4'), 'el título sugerido siempre es válido');

// ── Especificaciones ──────────────────────────────────────────────────
eq(typeLabelFor('lighting', { tipo_equipo: 'par_led' }), 'Par LED', 'tipo elegido');
eq(typeLabelFor('lighting', { tipo_equipo: 'otro' }), 'Iluminación', '«Otro» → genérico');
eq(typeLabelFor('audio', {}), 'Equipo de audio', 'sin tipo → genérico de la categoría');
eq(typeLabelFor('video', { tipo_video: 'Pantalla LED' }), 'Pantalla LED', 'el video usa la clave de la web');

const built = buildSpecs('audio', { tipo_equipo: 'altavoz_activo', potencia_watts_rms: '1000', incluye_cables: 'si', estado: 'bueno', entradas: '  2 XLR ', accesorios: '' });
eq(built, { tipo_equipo: 'altavoz_activo', potencia_watts_rms: 1000, incluye_cables: true, estado: 'bueno', entradas: '2 XLR', schema_version: SPEC_SCHEMA_VERSION }, 'documento limpio con schema_version');
eq(buildSpecs('audio', {}), { schema_version: SPEC_SCHEMA_VERSION }, 'sin datos: solo schema_version');
eq(buildSpecs('audio', { potencia_watts_rms: 'mucha', estado: 'regular', incluye_cables: 'tal vez' }), { schema_version: SPEC_SCHEMA_VERSION }, 'valores inválidos se omiten');
eq(buildSpecs('audio', { potencia_watts_rms: '9999999' }), { schema_version: SPEC_SCHEMA_VERSION }, 'número fuera de rango se omite');
eq(buildSpecs('audio', { potencia_watts_rms: '12,5' }).potencia_watts_rms, 12.5, 'coma decimal');
eq(buildSpecs('audio', { incluye_cables: 'no' }).incluye_cables, false, 'false se conserva (no es «sin dato»)');

// Conserva claves de la web y quita las de otra categoría
const existing = { tipo_sistema: ['PA Basico'], max_spl: 120, cobertura_personas: 200, potencia_watts: 500, tipo_equipo: 'par_led', schema_version: 1 };
const edited = buildSpecs('audio', { tipo_equipo: 'subwoofer' }, existing);
eq(edited.tipo_sistema, ['PA Basico'], 'conserva tipo_sistema de la web');
eq(edited.max_spl, 120, 'conserva max_spl de la web');
eq(edited.cobertura_personas, 200, 'conserva cobertura_personas de la web');
eq(edited.tipo_equipo, 'subwoofer', 'actualiza el tipo');
eq('potencia_watts' in edited, false, 'quita claves de otra categoría (iluminación)');
eq('tipo_equipo' in buildSpecs('audio', {}, existing), false, 'vaciar un campo propio lo quita');

eq(specsToForm('audio', built), { tipo_equipo: 'altavoz_activo', potencia_watts_rms: '1000', incluye_cables: 'si', estado: 'bueno', entradas: '2 XLR' }, 'documento → formulario');
eq(buildSpecs('audio', specsToForm('audio', built)), built, 'ida y vuelta sin pérdida');
eq(specsToForm('audio', null), {}, 'sin specs');

const empty = specQuality('audio', {});
eq(empty.percent, 0, 'sin datos: 0 %');
eq(empty.tips.length, 3, 'hasta 3 consejos');
const full = specQuality('advertising', { tipo_equipo: 'arco', medidas: '2 x 3 m', estado: 'nuevo', environment: 'Ambos', anio_aproximado: '2024', accesorios: 'x', requiere_operador: 'no', peso_kg: '5', consumo_watts: '0' });
eq(full.percent, 100, 'todo lleno: 100 %');
eq(full.tips, [], 'sin consejos si está completo');
const partial = specQuality('audio', { tipo_equipo: 'subwoofer', potencia_watts_rms: '800', estado: 'bueno' });
assert.ok(partial.percent > 0 && partial.percent < 100, 'parcial');
checks += 1;
assert.ok(specQuality('audio', { tipo_equipo: 'subwoofer' }).percent > specQuality('audio', { entradas: 'x' }).percent, 'un campo importante pesa más que uno normal');
checks += 1;
eq(specQuality('desconocida', {}).total > 0, true, 'categoría desconocida: solo campos comunes');

// Mostrar: nunca campos vacíos
eq(
  specDisplayItems('audio', built),
  [
    { label: 'Tipo de equipo', value: 'Altavoz activo' },
    { label: 'Potencia', value: '1000 W' },
    { label: 'Entradas', value: '2 XLR' },
    { label: 'Incluye cables y soportes', value: 'Sí' },
    { label: 'Estado', value: 'Bueno' },
  ],
  'campos formateados, en el orden del esquema',
);
eq(specDisplayItems('audio', { schema_version: 1 }), [], 'solo schema_version: nada que mostrar');
eq(specDisplayItems('audio', null), [], 'sin specs');
eq(specDisplayItems('audio', { potencia_watts_rms: 'x', estado: '', incluye_cables: null, tipo_equipo: 'inventado' }), [], 'inválidos o vacíos no se muestran');
eq(specDisplayItems('audio', { tipo_sistema: ['PA Basico'], max_spl: 120 }), [], 'claves que este esquema no muestra se ignoran');
eq(specDisplayItems('audio', { incluye_cables: false }), [{ label: 'Incluye cables y soportes', value: 'No' }], '«No» sí se muestra (es un dato)');

console.log(`OK: ${checks} comprobaciones de calidad de datos de equipos`);
