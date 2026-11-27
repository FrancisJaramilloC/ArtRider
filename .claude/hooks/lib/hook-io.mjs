// Entrada/salida común de los hooks PreToolUse. Cualquier error interno bloquea.
import { readFileSync } from "node:fs";

export const SHELL_TOOLS = new Set(["Bash", "PowerShell", "Monitor"]);

export function runHook(evaluate) {
  try {
    const event = JSON.parse(readFileSync(0, "utf8"));
    const verdict = evaluate(event);
    if (!verdict) return;
    if (verdict.decision === "deny") {
      process.stderr.write(`BLOQUEADO por hook del proyecto: ${verdict.reason}\n`);
      process.exitCode = 2;
      return;
    }
    // Nunca se emite "allow": el hook solo restringe.
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "ask",
        permissionDecisionReason: verdict.reason,
      },
    }));
  } catch (error) {
    process.stderr.write(`BLOQUEADO: el hook falló y no puede verificar la acción (${error.stack ?? error}).\n`);
    process.exitCode = 2;
  }
}
