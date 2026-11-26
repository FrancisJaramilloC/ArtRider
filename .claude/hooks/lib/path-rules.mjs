// Carpeta privada (bloqueada) y archivos .env (piden permiso).
import path from "node:path";
import { toPath } from "./shell.mjs";

export const PRIVATE_DIR = "C:\\dev\\_privado";

const PRIVATE_NAME = path.basename(PRIVATE_DIR.replace(/\\/g, "/")).toLowerCase();
const PATH_KEYS = ["file_path", "filePath", "path", "notebook_path", "paths", "file_paths", "root", "out_dir"];
const ENV_FILE = /(^|[\\/=:@<>])(\.env(\.[\w.-]+)?|(?!process\.|meta\.)[\w-]+\.env)$/i;

const normalize = (p) => p.replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
const isInside = (child, parent) => child === parent || child.startsWith(`${parent}/`);

function pathValues(input) {
  return PATH_KEYS.flatMap((key) => input[key] ?? []).filter((v) => typeof v === "string");
}

export function checkPrivate(toolName, input, cwd) {
  const deny = { decision: "deny", reason: `acceso a ${PRIVATE_DIR} prohibido.` };
  const privateDir = normalize(PRIVATE_DIR);
  const isSearch = toolName === "Grep" || toolName === "Glob";
  const texts = [input.command, toolName === "Glob" ? input.pattern : null, input.glob].filter(Boolean);
  if (texts.some((t) => t.toLowerCase().includes(PRIVATE_NAME))) return deny;
  if (isInside(normalize(cwd), privateDir)) return deny;
  const paths = pathValues(input).map((p) => normalize(toPath(cwd, p)));
  if (paths.some((p) => isInside(p, privateDir))) return deny;
  // Una búsqueda desde una carpeta superior recorrería también la privada.
  const roots = isSearch ? [normalize(toPath(cwd, input.path ?? "."))] : [];
  if (isSearch && path.isAbsolute(input.pattern ?? "")) roots.push(normalize(input.pattern.split(/[*?[{]/)[0]));
  return roots.some((r) => isInside(privateDir, r)) ? deny : null;
}

export function checkEnv(toolName, input, invocations) {
  const ask = { decision: "ask", reason: "este comando o herramienta accede a un archivo .env." };
  const candidates = [
    ...pathValues(input),
    ...(toolName === "Grep" || toolName === "Glob" ? [input.glob, toolName === "Glob" ? input.pattern : null] : []),
    ...invocations.flatMap((call) => call.args),
  ];
  return candidates.some((c) => typeof c === "string" && ENV_FILE.test(c)) ? ask : null;
}
