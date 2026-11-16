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
pnpm dlx expo-doctor
pnpm exec expo export --platform ios      # y android; borrar dist/ después
pnpm exec expo install <paquete>          # para librerías nativas (versión del SDK)
```

## Estructura (`src/`)

- `app/` rutas expo-router (finas, montan una pantalla): `(auth)`, `(tabs)`, `(provider)`, `listing/`, `package/`, `checkout/`, `chat/`, `provider/`…
- `screens/` pantallas completas por dominio · `components/` componentes por dominio y `ui/`.
- `services/` única capa que habla con Supabase · `contexts/` Auth y ColorScheme · `hooks/` · `constants/theme.ts` tokens.
- Alias `@/*` → `src/*`.

## Convenciones

- Importes en centavos (`daily_price`, `total_price`); mostrar dividiendo entre 100.
- Colores, radios, espaciado y tipografía salen de `constants/theme.ts` y del sistema de diseño; no hardcodear hex en pantallas.
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
