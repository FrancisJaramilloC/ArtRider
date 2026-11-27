// Protege la configuración de Claude Code: nada escribe en una carpeta .claude/ del proyecto.
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { toPath } from "./shell.mjs";

const deny = { decision: "deny", reason: "escritura en .claude/ prohibida (configuración y hooks protegidos)." };

const READ_TOOLS = new Set(["Read", "Grep", "Glob"]);
const PATH_KEYS = ["file_path", "filePath", "path", "notebook_path", "paths", "file_paths", "out_dir"];
const MENTION = /(^|[\\/'"=:\s(,<>])\.claude($|[\\/'"\s),;*?])/i;
const HOME_PREFIX = /^(~|\$HOME|\$\{HOME\}|\$env:USERPROFILE|%USERPROFILE%)[\\/]/i;
const READERS = new Set(["cat", "type", "ls", "dir", "gci", "get-childitem", "get-content", "gc", "head", "tail",
  "grep", "rg", "select-string", "sls", "wc", "diff", "stat", "file", "test-path", "get-item", "gi",
  "resolve-path", "echo", "write-output", "write-host", "printf", "pwd", "tree", "get-filehash",
  "sha256sum", "sort", "uniq", "cut", "find"]);
const REMOVERS = new Set(["rm", "del", "erase", "rmdir", "rd", "ri", "remove-item", "mv", "move", "mi",
  "move-item", "rename-item", "ren", "rni"]);
const WRITERS = new Set([...REMOVERS, "cp", "copy", "cpi", "copy-item", "tee", "tee-object", "set-content",
  "sc", "add-content", "ac", "out-file", "new-item", "ni", "clear-content", "clc", "touch", "mkdir", "ln",
  "chmod", "sed", "truncate", "dd", "install", "rsync", "robocopy", "xcopy", "unzip", "tar",
  "expand-archive", "export-csv"]);
// Llamadas .NET desde PowerShell: la ruta queda dentro de paréntesis, separada del método.
const DOTNET_WRITE = /\]::(Write|Append|Delete|Move|Copy|Replace|Create|Open)\w*/i;
const GIT_SAFE = new Set(["status", "diff", "log", "show", "add", "commit", "push", "fetch", "ls-files",
  "check-ignore", "blame", "grep", "rev-parse"]);

const slashes = (p) => p.replace(/\\/g, "/").toLowerCase();
const HOME_CLAUDE = slashes(path.join(homedir(), ".claude"));

/** ¿La ruta cae dentro de un .claude/ que no sea el personal ni el contenido de un worktree? */
export function isProtected(cwd, target) {
  if (HOME_PREFIX.test(target)) return false;
  const full = slashes(toPath(cwd, target));
  if (full === HOME_CLAUDE || full.startsWith(`${HOME_CLAUDE}/`)) return false;
  return /\/\.claude(\/|$)/.test(full.replace(/\/\.claude\/worktrees\/[^/]+(?=\/)/g, ""));
}

function mentions(cwd, arg) {
  const value = arg.replace(/^--?[\w-]+[=:]/, "");
  if (/[\s'"(]/.test(value)) return MENTION.test(value) && !HOME_PREFIX.test(value);
  return MENTION.test(value) && isProtected(cwd, value.replace(/[*?].*$/, "") || ".");
}

/** Carpeta que contiene un .claude/ del proyecto: borrarla o restaurarla lo modifica. */
function containsConfig(cwd, target) {
  const full = toPath(cwd, target.replace(/(^|[\\/])\*+$/, "$1") || ".");
  return slashes(full) !== slashes(homedir()) && existsSync(path.join(full, ".claude"));
}

const touches = (call) => isProtected(call.cwd, ".") || call.args.some((a) => mentions(call.cwd, a));
const operands = (call) => call.args.filter((a) => !a.startsWith("-"));

/** `node .claude/hooks/*.mjs` (pruebas incluidas) se permite; código en línea, no. */
function runsOwnScripts({ name, args, cwd }) {
  if (name !== "node" || args.some((a) => /^(-e|-p|--eval|--print|-r|--require|--import)(=|$)/.test(a))) return false;
  const script = operands({ args })[0];
  return Boolean(script) && /[\\/]\.claude[\\/]hooks[\\/].*\.mjs$/i.test(toPath(cwd, script));
}

function gitWrites(call) {
  if (call.args.some((a) => a.startsWith("--output") && mentions(call.cwd, a))) return true;
  if (GIT_SAFE.has(call.sub)) return false;
  if (touches(call)) return true;
  return ["checkout", "restore"].includes(call.sub) && operands(call).some((a) => containsConfig(call.cwd, a));
}

function invocationWrites(call) {
  if (call.name === "redirect") return call.args.some((a) => isProtected(call.cwd, a));
  if (call.name === "pnpm-cli") return false;
  if (call.name === "git") return gitWrites(call);
  if (REMOVERS.has(call.name) && operands(call).some((a) => containsConfig(call.cwd, a))) return true;
  if (!touches(call)) return false;
  if (call.name === "find") return call.args.some((a) => /^-(delete|fprint|fls)/.test(a));
  if (call.name === "sort") return call.args.some((a) => /^(-o|--output)/.test(a));
  return !READERS.has(call.name) && !runsOwnScripts(call);
}

export function checkClaudeDir(toolName, input, invocations, cwd) {
  if (!READ_TOOLS.has(toolName)) {
    const paths = PATH_KEYS.flatMap((key) => input[key] ?? []).filter((v) => typeof v === "string");
    if (paths.some((p) => isProtected(cwd, p))) return deny;
  }
  if (invocations.some(invocationWrites)) return deny;
  // El destino llega por tubería o variable: si el comando nombra .claude, no se puede verificar.
  const hidden = (call) => (WRITERS.has(call.name) || call.name === "redirect")
    && (!operands(call).length || call.args.some((a) => a.includes("$")));
  const command = input.command ?? "";
  return MENTION.test(command) && (DOTNET_WRITE.test(command) || invocations.some(hidden)) ? deny : null;
}
