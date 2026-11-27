// Hook PreToolUse (Bash/PowerShell): bloquea `git commit` si `pnpm exec tsc --noEmit`
// falla en un paquete con cambios.
import { spawnSync } from "node:child_process";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { runHook, SHELL_TOOLS } from "./lib/hook-io.mjs";
import { analyze, git } from "./lib/shell.mjs";

const PACKAGES = ["art-rider", "artrider-mobile"];
const TSC_TIMEOUT_MS = 240_000;
const OUTPUT_LINES = 30;

function gitFiles(root, args) {
  const output = git(root, args);
  if (output === null) throw new Error(`falló git ${args.join(" ")}`);
  return output.split("\n").filter(Boolean);
}

/** Archivos que entrarían en el commit. El hook corre antes que el comando, así que se peca de incluir de más. */
function changedFiles(root, commit, stagesFirst) {
  const staged = gitFiles(root, ["diff", "--cached", "--name-only"]);
  const takesWorktree = stagesFirst || commit.args.some((a, i) =>
    /^-[A-Za-z]*[aio]|^--(all|include|only|pathspec)/.test(a)
    || (!a.startsWith("-") && !/^(-[A-Za-z]*[mFCct]|--(message|file|author|date|template))$/.test(commit.args[i - 1] ?? "")));
  if (!takesWorktree) return staged;
  return [
    ...staged,
    ...gitFiles(root, ["diff", "--name-only"]),
    ...gitFiles(root, ["ls-files", "--others", "--exclude-standard"]),
  ];
}

export function runTsc(directory) {
  // verify-deps-before-run=error: el hook nunca instala dependencias por su cuenta.
  const result = spawnSync("pnpm exec tsc --noEmit", {
    cwd: directory,
    shell: true,
    encoding: "utf8",
    timeout: TSC_TIMEOUT_MS,
    env: { ...process.env, pnpm_config_verify_deps_before_run: "error" },
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}${result.error?.message ?? ""}`.trim();
  return { ok: result.status === 0, output: output.split("\n").slice(0, OUTPUT_LINES).join("\n") };
}

export function evaluate({ tool_name: toolName, tool_input: input = {}, cwd = process.cwd() }, check = runTsc) {
  if (!SHELL_TOOLS.has(toolName) || !input.command) return null;
  const shell = toolName === "PowerShell" ? "PowerShell" : "Bash";
  const invocations = analyze(input.command, { cwd, shell });
  const failures = new Map();
  let stagesFirst = false;
  for (const call of invocations) {
    if (call.name !== "git") continue;
    if (["add", "rm", "mv", "stage"].includes(call.sub)) stagesFirst = true;
    if (call.sub !== "commit") continue;
    const root = git(call.cwd, ["rev-parse", "--show-toplevel"]);
    if (!root) return { decision: "deny", reason: `no se encontró el repositorio en ${call.cwd}.` };
    const files = changedFiles(root, call, stagesFirst);
    for (const name of PACKAGES.filter((p) => files.some((f) => f.startsWith(`${p}/`)))) {
      const result = check(path.join(root, name));
      if (!result.ok) failures.set(name, result.output);
    }
  }
  if (!failures.size) return null;
  const detail = [...failures].map(([name, output]) => `--- ${name}\n${output}`).join("\n");
  return { decision: "deny", reason: `\`pnpm exec tsc --noEmit\` falló; no se hace el commit.\n${detail}` };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) runHook(evaluate);
