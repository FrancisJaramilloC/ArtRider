// Órdenes que piden permiso: cambios de dependencias con pnpm y limpieza con git.
const ask = (reason) => ({ decision: "ask", reason });
const PNPM_VALUE_OPTIONS = new Set(["-C", "--dir", "--filter", "-F"]);
const PNPM_ASK = new Set(["dlx", "add", "remove", "rm", "uninstall", "un"]);

export function checkPnpm({ args }) {
  let i = 0;
  while (i < args.length && args[i].startsWith("-")) i += PNPM_VALUE_OPTIONS.has(args[i]) ? 2 : 1;
  const command = args[i];
  const rest = args.slice(i + 1);
  if (PNPM_ASK.has(command)) return ask(`pnpm ${command} cambia dependencias o ejecuta paquetes externos.`);
  if (command === "exec" && rest[0] !== "tsc") return ask("pnpm exec de algo distinto de tsc.");
  const addsPackage = ["install", "i"].includes(command) && rest.some((a) => !a.startsWith("-"));
  return addsPackage ? ask("pnpm install <paquete> añade dependencias.") : null;
}

export function checkCleanup({ sub, args }) {
  if (sub === "clean") return ask("git clean borra archivos sin seguimiento.");
  const forced = args.some((a) => /^-[A-Za-z]*f/.test(a) || (a.length > 3 && "--force".startsWith(a)));
  return sub === "worktree" && args[0] === "remove" && forced ? ask("git worktree remove --force.") : null;
}
