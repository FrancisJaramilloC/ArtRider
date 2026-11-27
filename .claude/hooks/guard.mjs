// Hook PreToolUse (todas las herramientas): git protegido, base de producción,
// carpeta privada, archivos .env, .claude/, dependencias y limpieza.
import { pathToFileURL } from "node:url";
import { checkClaudeDir } from "./lib/claude-rules.mjs";
import { checkDatabase, checkSupabaseMcp } from "./lib/db-rules.mjs";
import { checkGh, checkGit } from "./lib/git-rules.mjs";
import { runHook, SHELL_TOOLS } from "./lib/hook-io.mjs";
import { checkEnv, checkPrivate } from "./lib/path-rules.mjs";
import { analyze } from "./lib/shell.mjs";
import { checkCleanup, checkPnpm } from "./lib/tool-rules.mjs";

function checkInvocation(call) {
  if (call.name === "opaque") {
    return { decision: "deny", reason: "comando codificado o demasiado anidado: no se puede verificar." };
  }
  if (call.name === "git") return checkGit(call) ?? checkCleanup(call);
  if (call.name === "pnpm-cli") return checkPnpm(call);
  if (call.name === "gh") return checkGh(call);
  return checkDatabase(call);
}

export function evaluate({ tool_name: toolName, tool_input: input = {}, cwd = process.cwd() }) {
  const shell = toolName === "PowerShell" ? "PowerShell" : "Bash";
  const invocations = SHELL_TOOLS.has(toolName) && input.command
    ? analyze(input.command, { cwd, shell })
    : [];
  const verdicts = [
    checkPrivate(toolName, input, cwd),
    checkClaudeDir(toolName, input, invocations, cwd),
    ...invocations.map(checkInvocation),
    /^mcp__.*supabase.*__/i.test(toolName) ? checkSupabaseMcp(toolName, input) : null,
    checkEnv(toolName, input, invocations),
  ].filter(Boolean);
  return verdicts.find((v) => v.decision === "deny") ?? verdicts[0] ?? null;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) runHook(evaluate);
