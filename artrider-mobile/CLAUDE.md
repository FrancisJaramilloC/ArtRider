@AGENTS.md

# artrider-mobile

App móvil de ArtRider (renta de equipos de audio, luces, video y efectos en Ecuador). Es la hermana de la web `../art-rider` (Next.js) y comparte la base de datos Supabase. UI en **español**.

- Expo **SDK 58** (React Native 0.88, React 19.3), TypeScript estricto, expo-router (rutas tipadas), React Compiler activo.
- Gestor de paquetes: **pnpm 11.1.2** (fijado en `package.json`). Nunca npm, npx ni yarn; el único lockfile es `pnpm-lock.yaml`.
- Probar en Expo Go (SDK 58) con `pnpm start`. Arquitectura completa en `docs/ARQUITECTURA.md`; base de datos en `docs/BASE_DE_DATOS.md`.

## Comandos

```bash
pnpm install
pnpm start
pnpm exec tsc --noEmit
pnpm test:pricing      # modelo de precios
pnpm test:partner      # reservas y dinero del Partner
pnpm test:listing      # calidad de datos de equipos
pnpm dlx expo-doctor
pnpm exec expo export --platform ios      # y android; borrar dist/ después
pnpm exec expo install <paquete>          # para librerías nativas (versión del SDK)
```

## Vista web (solo para revisar diseño)

- Abrir con `pnpm exec expo start --web --port 8082`. La web NO es un destino de producción (`app.json` → `web.output: "single"`).
- `metro.config.js` sustituye SOLO en web `react-native-maps`, `react-native-map-clustering` y `react-native-webview` por stubs de `src/dev/web-stubs/` (placeholder con borde discontinuo); iOS y Android no cambian.
- El pago (WebView de Kushki) y los mapas no funcionan en web; no usar esta vista para probar flujos.

## Auditoría de UI (solo desarrollo)

- `node scripts/ui-audit/serve.mjs 8091` (reinicia mi servidor web propio) y `AUDIT_BASE=http://localhost:8091 node scripts/ui-audit/audit.mjs <etiqueta> <rutas> 360,390,430,768` miden márgenes, desbordes, ritmo, tarjetas y táctiles en Edge headless; capturas en `.ui-audit/` (ignorado).
- Pantallas con sesión: `/dev-gallery?s=cards|lists|messages|states` (fixtures locales, solo `__DEV__`).
- Espaciado: margen 16 (<600) / 24, ritmo `Rhythm` (32/12/24/12/12) y `Thumb` en `constants/theme.ts`; nunca números sueltos.

- Con sesión: `AUDIT_AUTH=1` usa `UI_AUDIT_EMAIL`/`UI_AUDIT_PASSWORD` de `.ui-audit/.env` (ignorado; el script es de solo lectura: únicamente navega por pestañas permitidas, mide y captura). No abrir ni imprimir ese archivo.
- Pestañas: todas usan `TabScreen` (cabecera única; el contenido arranca en la misma y). Chips de filtro con `ChipRow`; Perfil/Menú con `AccountMenu`. Interacción: `Button`/`Chip`/`IconButton`/`Switch`/`ListRow` con estado presionado, `expo-haptics` (`utils/haptics.ts`, nunca en web) y `animateLayout()` (`utils/motion.ts`, respeta reducir movimiento).

## Estructura (`src/`)

- `app/` rutas expo-router (finas, montan una pantalla): `(auth)`, `(tabs)`, `(provider)`, `listing/`, `package/`, `checkout/`, `chat/`, `provider/`…
- `screens/` pantallas completas por dominio · `components/` componentes por dominio y `ui/`.
- `services/` única capa que habla con Supabase · `contexts/` Auth y ColorScheme · `hooks/` · `constants/theme.ts` tokens.
- Alias `@/*` → `src/*`.

## Convenciones

- Roles en la UI: el cliente es **Rider** y el proveedor es **Partner** (plurales Riders/Partners; invariables en género, mejor sin artículo: «Modo Rider», «Ser Partner»). Todo texto visible sale de `src/constants/copy.ts`. No cambian los identificadores de código, las rutas ni los valores de rol en Supabase.
- Importes en centavos (`daily_price`, `total_price`); mostrar dividiendo entre 100.
- Colores, radios, espaciado y tipografía salen de `constants/theme.ts`; UI con los componentes de `components/ui/` y layout con `useLayout()` (sin anchos fijos, margen lateral `gutter`, objetivos táctiles ≥ 44pt). No hardcodear hex en pantallas.
- Usar `useTheme()`/`useColorScheme()` de `@/hooks/*`, nunca el de `react-native` (ignora el toggle de tema).
- Llamadas a Supabase solo en `services/`. No cambiar lógica de negocio al rediseñar UI.
- Sin `any` nuevos, sin `@ts-ignore`. Imports de pestañas: `expo-router/native-tabs`.
- `react-native-webview` 14: tipar con `WebView<object>` (su tipado por defecto colapsa a `never`).
- No tocar el comportamiento del WebView de Kushki (solo su entorno visual).

## Variables de entorno (solo nombres; viven en `.env`, nunca versionar)

`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_KUSHKI_MERCHANT_ID`.
`src/services/supabase.ts` lanza un error claro al arrancar si faltan las dos de Supabase. La clave privada de Kushki y la `service_role` nunca van en la app.

## Reglas de seguridad

- No imprimir valores de `.env`, llaves ni tokens: solo nombres de variable.
- Supabase es **solo lectura** desde este repo: no usar `service_role`, no ejecutar migraciones, `db push`, `db reset` ni INSERT/UPDATE/DELETE de prueba.
- No versionar `.env`, `dist/` ni `.expo/` (ya ignorados).
- Sin push, merge ni force push salvo petición explícita.
- Los cambios de base de datos se proponen, no se aplican.

## Precios, dinero y datos (reglas de dominio)

- Precios: solo `utils/pricing.ts` (tasas de `pricing_settings` vía `usePricing()`). El Partner nunca ve montos del Rider; el Rider nunca ve `partner_amount` ni la comisión.
- Dinero del Partner (`utils/earnings.ts`): Pendiente de tu respuesta / Próximos ingresos / Por cobrar. «Cobrado» no existe hasta tener registro de pagos.
- Reservas del Partner: «Próximas» y «En curso» se calculan por fecha con «hoy» en Ecuador (UTC−5).
- Equipos: marca, modelo y categoría obligatorios, marca normalizada, título validado, `specs` con `schema_version` (`constants/listingSpecs.ts`).
- Cancelación del Rider: siempre por la edge `client-cancel-booking` (reembolsa y luego cancela); nunca un `UPDATE` directo de `bookings`.
- Cambios de base de datos y funciones sin desplegar: `docs/PROPUESTA_*.sql` y `docs/BASE_DE_DATOS.md` §8. No aplicar ni desplegar desde aquí.

## Futuro

- TODO: Futuro: vista AR "ver en tu espacio" (requiere development build, no Expo Go). No implementar hasta migrar a development build.
