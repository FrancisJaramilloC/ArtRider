Gestor de paquetes: usar siempre pnpm; el único lockfile es pnpm-lock.yaml.

Versión de pnpm: 11.1.2, fijada en el campo "packageManager" de art-rider/package.json y artrider-mobile/package.json (requiere Node >= 22.13).
Activación: no hace falta corepack. Con pnpm >= 9.7 instalado globalmente, al ejecutar pnpm dentro de art-rider o artrider-mobile se descarga y usa automáticamente la versión fijada (compruébalo con `pnpm --version`). Si Node no incluye corepack (Node 25+), no ejecutes `corepack enable`; instala pnpm con `npm`-free alternativas oficiales (por ejemplo `winget install pnpm.pnpm` o el instalador de pnpm.io) y deja que "packageManager" haga el resto.
Comandos puntuales: `pnpm exec <bin>` en lugar de npx y `pnpm dlx <paquete>` para ejecutables sin instalar (por ejemplo `pnpm dlx expo-doctor@latest`).
