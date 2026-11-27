// Reglas de git y gh. Cada regla devuelve null o { decision: "deny" | "ask", reason }.
import { spawnSync } from "node:child_process";
import { git } from "./shell.mjs";

const deny = (reason) => ({ decision: "deny", reason });
const ask = (reason) => ({ decision: "ask", reason });
const shortName = (ref) => ref.replace(/^\+/, "").replace(/^(refs\/)?heads\//, "");
const positionals = (args, valueOptions = []) =>
  args.filter((a, i) => !a.startsWith("-") && !valueOptions.includes(args[i - 1]));
/** Git admite abreviar opciones largas (--har = --hard). */
const isLong = (arg, full) => arg.length > 3 && full.startsWith(arg.split("=")[0]);
const hasShort = (args, letter) => args.some((a) => new RegExp(`^-[A-Za-z]*${letter}`).test(a));
const isRecovery = (args) => args.includes("--abort") || args.includes("--quit");

function pushTargets({ args, cwd, branches }) {
  const refspecs = positionals(args, ["-o", "--push-option", "--repo", "--receive-pack", "--exec"]).slice(1);
  if (refspecs.length) {
    return refspecs.flatMap((spec) => {
      const dst = spec.replace(/^\+/, "").split(":").pop();
      return dst === "HEAD" || dst === "@" ? branches : [shortName(dst)];
    });
  }
  if (args.includes("--tags")) return [];
  const configured = git(cwd, ["config", "--get-regexp", "^(remote\\..*\\.push|push\\.default)$"]) ?? "";
  if (/^remote\./m.test(configured) || /push\.default matching/.test(configured)) return [""];
  return branches.flatMap((b) => [b, shortName(git(cwd, ["config", `branch.${b}.merge`]) ?? b)]);
}

function checkPush(call) {
  const { args } = call;
  if (args.some((a) => a.includes("$"))) return deny("push con variables: escribe remoto y rama literalmente.");
  const forced = hasShort(args, "f") || args.some((a) => /^\+/.test(a) || (a.startsWith("--f") && "--force-with-lease --force-if-includes".includes(a.split("=")[0])));
  if (forced) return deny("git push forzado (--force, -f, --force-with-lease o +refspec) está prohibido.");
  if (args.some((a) => ["--mirror", "--all", "--branches"].some((f) => isLong(a, f)))) {
    return deny("push masivo (--all/--branches/--mirror) puede alcanzar main.");
  }
  const targets = pushTargets(call);
  if (targets.includes("main")) return deny("git push sobre main está prohibido.");
  if (targets.some((t) => t === "" || t.includes("*"))) return deny("destino de push amplio o ambiguo: nombra la rama.");
  return targets.includes("develop") ? ask("git push a develop.") : null;
}

function checkMerge({ args, branches }) {
  if (isRecovery(args)) return null;
  if (branches.includes("main")) return deny("git merge sobre main está prohibido.");
  return branches.includes("develop") ? ask("git merge hacia develop.") : null;
}

function checkPull({ args, branches }) {
  const refs = positionals(args).slice(1);
  if (refs.some((r) => /:(refs\/heads\/)?main$/.test(r))) return deny("este pull escribe sobre main.");
  if (branches.includes("main")) {
    const rebasing = hasShort(args, "r") || args.some((a) => a.startsWith("--rebase"));
    const safe = args.includes("--ff-only") && !rebasing && refs.every((r) => r === "main");
    if (!safe) return deny("en main solo se permite `git pull --ff-only` (sin otra rama). Si cambias de rama en el mismo comando, sepáralo.");
  }
  return branches.includes("develop") && refs.some((r) => shortName(r) !== "develop")
    ? ask("git pull de otra rama hacia develop (es un merge).") : null;
}

function checkRebase({ args, branches }) {
  if (isRecovery(args)) return null;
  const pos = positionals(args, ["--onto", "-x", "--exec", "-s", "--strategy", "-X"]);
  const rewritten = args.includes("--root") ? pos[0] : pos[1];
  const onMain = branches.includes("main") || (rewritten && shortName(rewritten) === "main");
  if (args.some((a) => a.includes("$"))) return deny("rebase con variables: escribe las ramas literalmente.");
  return onMain ? deny("git rebase sobre main está prohibido.") : null;
}

function checkReset({ args, branches }) {
  if (args.some((a) => isLong(a, "--hard"))) return deny("git reset --hard está prohibido.");
  return branches.includes("main") ? deny("git reset sobre main está prohibido.") : null;
}

/** Otras formas de mover o borrar main. */
function checkRefMove({ sub, args }) {
  const names = args.map(shortName);
  const moves = {
    branch: () => names.includes("main") && args.some((a) => /^(-[fdDmMC]+|--force|--delete|--move)$/.test(a)),
    checkout: () => names[args.indexOf("-B") + 1] === "main" && args.includes("-B"),
    switch: () => args.some((a, i) => /^(-C|--force-create)$/.test(a) && names[i + 1] === "main"),
    "update-ref": () => names.includes("main"),
    fetch: () => args.some((a) => /:(refs\/heads\/|heads\/)?main$/.test(a)),
  };
  return moves[sub]?.() ? deny(`git ${sub} que modifica main está prohibido.`) : null;
}

function checkCommit({ branches }) {
  return branches.some((b) => b === "develop" || b === "main")
    ? deny("No se commitea en develop ni en main: crea una rama desde develop") : null;
}

/** gh api: solo las lecturas (GET sin campos) pasan sin preguntar. */
function checkGhApi(args) {
  const writes = ask("gh api que puede escribir o mezclar.");
  if (args.some((a) => a.includes("$"))) return ask("gh api con variables: no se puede verificar.");
  for (let i = 0; i < args.length; i += 1) {
    const method = args[i].match(/^(?:-X|--method)=?(.*)$/);
    if (method && (method[1] || args[i + 1] || "").toUpperCase() !== "GET") return writes;
    if (/^(-[fF]|--field|--raw-field|--input)(=|$)/.test(args[i]) || /^-[fF]./.test(args[i])) return writes;
  }
  return args.some((a) => /\/merges?(\/|\?|$)/i.test(a)) ? writes : null;
}

const GIT_RULES = { commit: checkCommit, push: checkPush, merge: checkMerge, pull: checkPull, rebase: checkRebase, reset: checkReset };

export function checkGit(call) {
  if (call.inlineAlias) return deny("git -c alias.* oculta el subcomando.");
  if (call.sub.includes("$")) return deny("subcomando de git dinámico: escríbelo literalmente.");
  return GIT_RULES[call.sub]?.(call) ?? checkRefMove(call);
}

export function checkGh({ args, cwd }, run = spawnSync) {
  const [group, action, ...rest] = args;
  if (group === "api") return checkGhApi(args.slice(1));
  if (group !== "pr" || action !== "merge") return null;
  const selector = positionals(rest, ["-R", "--repo", "-b", "--body", "-t", "--subject", "-F", "--body-file"])[0];
  const repoAt = rest.findIndex((a) => a === "-R" || a === "--repo");
  const query = ["pr", "view", ...(selector ? [selector] : []), "--json", "baseRefName", "-q", ".baseRefName",
    ...(repoAt === -1 ? [] : ["--repo", rest[repoAt + 1]])];
  const result = run("gh", query, { cwd, encoding: "utf8", timeout: 20000 });
  const base = result.status === 0 ? result.stdout.trim() : null;
  if (!base) return deny("no se pudo comprobar la rama base del PR; no se permite el merge.");
  if (base === "main") return deny("gh pr merge hacia main está prohibido.");
  return ask(`gh pr merge hacia ${base}.`);
}
