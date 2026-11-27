Gestor de paquetes: usar siempre pnpm; el único lockfile es pnpm-lock.yaml.

Versión de pnpm: 11.1.2, fijada en el campo "packageManager" de art-rider/package.json y artrider-mobile/package.json (requiere Node >= 22.13).
Activación: no hace falta corepack. Con pnpm >= 9.7 instalado globalmente, al ejecutar pnpm dentro de art-rider o artrider-mobile se descarga y usa automáticamente la versión fijada (compruébalo con `pnpm --version`). Si Node no incluye corepack (Node 25+), no ejecutes `corepack enable`; instala pnpm con el instalador oficial (por ejemplo `winget install pnpm.pnpm` o el script de pnpm.io) y deja que "packageManager" haga el resto.
Comandos puntuales: `pnpm exec <bin>` en lugar de npx y `pnpm dlx <paquete>` para ejecutables sin instalar (por ejemplo `pnpm dlx expo-doctor@latest`).

## Diseño (web y móvil)

- Skills de diseño (instaladas a nivel global): `ios-design-guidelines`, `android-design-guidelines` y `web-design-guidelines` de ehmo/platform-design-skills (Apple HIG, Material Design 3, WCAG 2.2). Usarlas al crear o revisar UI. No usar otras skills de diseño de Apple.
- Manda el design system de ArtRider sobre las skills: en el móvil son los tokens de `artrider-mobile/src/constants/theme.ts` y los componentes de `components/ui/` (ver `artrider-mobile/CLAUDE.md`). Si una regla de una skill choca con el design system, gana el design system y se avisa a Emilio.
- Punto medio iPhone/Android:
  - **Igual en todas partes (marca):** colores, logo, tipografía de títulos, íconos propios, tarjetas de equipos/paquetes, precios, fotos, botones principales, espaciados, radios y el flujo buscar → detalle → reservar → pagar.
  - **Se adapta a cada sistema (comportamiento):** volver atrás (deslizar en iOS, botón/gesto en Android), selectores de fecha y hora nativos, alertas, menús, hojas de compartir y la fuente del texto normal. Usar lo nativo de Expo Router y los componentes del sistema; `Platform.OS` solo donde haga falta.
  - **Reglas comunes:** objetivos táctiles con `MinTouch` de `theme.ts`, contraste WCAG AA y texto que crece con el tamaño de letra del sistema.

## Equipo de agentes (trabajo en paralelo)

- Agent Teams: un líder reparte el trabajo en la lista de tareas compartida; cada compañero toma una tarea, avisa al terminar y pregunta al compañero dueño de la zona antes de tocar algo suyo.
- **Máximo 3 agentes a la vez** (plan Pro). Configuración típica: web, móvil y revisor.
- **Un dueño por zona:** `art-rider/` (web), `artrider-mobile/` (móvil) y `supabase/` (funciones y SQL). Solo un agente toca `supabase/`, migraciones o propuestas SQL. Nadie edita archivos de otra zona sin acordarlo por mensaje.
- **Ramas:** cada agente en su propia rama cortada de `develop` actualizada (una por bloque de trabajo). Nunca trabajar ni commitear en `develop`. `main` no se toca nunca.
- **Revisor:** antes de cada PR a `develop`, un agente que no escribió el código revisa el diff contra las skills (diseño y seguridad) y este archivo, y corre `pnpm exec tsc --noEmit` y los tests de la zona. Emilio aprueba cada merge; los agentes no mezclan a `develop` sin su permiso.
- **Piden permiso a Emilio cada vez:** push a `develop`, merge, leer `.env`, desplegar funciones y ejecutar SQL.
- Si dos agentes no se ponen de acuerdo, el líder para y le pregunta a Emilio.
