// Pruebas: node --test .claude/hooks/hooks.test.mjs
// Usan un repositorio temporal; no ejecutan ninguno de los comandos evaluados.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";
import { evaluate as guard } from "./guard.mjs";
import { checkGh } from "./lib/git-rules.mjs";
import { evaluate as preCommit } from "./pre-commit-tsc.mjs";

const repos = [];
after(() => repos.forEach((dir) => rmSync(dir, { recursive: true, force: true })));

function repo(branch) {
  const dir = mkdtempSync(path.join(tmpdir(), "hooks-"));
  repos.push(dir);
  const run = (...args) => assert.equal(spawnSync("git", args, { cwd: dir }).status, 0, args.join(" "));
  run("init", "-q", "-b", "main");
  run("-c", "user.name=t", "-c", "user.email=t@t", "commit", "-q", "--allow-empty", "-m", "init");
  for (const name of ["develop", "feat/x"]) run("branch", name);
  run("switch", "-q", branch);
  return { dir, run };
}

const onMain = repo("main").dir;
const onDevelop = repo("develop").dir;
const onFeature = repo("feat/x").dir;

const verdict = (command, cwd, tool = "Bash") =>
  guard({ tool_name: tool, tool_input: { command }, cwd })?.decision ?? "pass";

const withConfig = repo("feat/x").dir;
mkdirSync(path.join(withConfig, ".claude", "hooks"), { recursive: true });

const CASES = {
  deny: [
    [onFeature, "git push origin main"], [onFeature, "git push origin HEAD:main"],
    [onFeature, "git push origin feat/x:refs/heads/main"], [onFeature, "git push origin :main"],
    [onMain, "git push"], [onMain, "git push origin HEAD"],
    [onFeature, "git push --force"], [onFeature, "git push -f origin feat/x"],
    [onFeature, "git push -uf origin feat/x"], [onFeature, "git push --force-with-lease"],
    [onFeature, "git push origin +feat/x"], [onFeature, "git push --all"],
    [onFeature, "git push origin $BRANCH"],
    [onFeature, "git reset --hard"], [onFeature, "git reset --har HEAD~1"], [onMain, "git reset HEAD~1"],
    [onMain, "git merge feat/x"], [onMain, "git rebase develop"], [onFeature, "git rebase develop main"],
    [onMain, "git pull"], [onFeature, "git switch main && git merge feat/x"],
    [onFeature, "git checkout main; git reset HEAD~1"], [onFeature, "git branch -f main HEAD"],
    [onFeature, "git fetch origin develop:main"], [onFeature, "git update-ref refs/heads/main HEAD"],
    [onFeature, `git -C "${onMain}" merge feat/x`], [onFeature, `cd "${onMain}" && git reset`],
    [onFeature, "FOO=1 git -c core.pager=cat push origin main"], [onFeature, "bash -c 'git push origin main'"],
    [onFeature, "echo ok && (git push origin main)"], [onFeature, 'echo "$(git reset --hard)"'],
    [onFeature, "git status\ngit push origin main"], [onFeature, "supabase db push"],
    [onFeature, "pnpm exec supabase db push --linked"], [onFeature, "pnpm dlx supabase@latest db push"],
    [onFeature, "supabase db reset --linked"], [onFeature, "supabase --workdir . migration repair 1"],
    [onFeature, "supabase db dump"], [onFeature, "psql $DATABASE_URL -c 'select 1'"],
    [onFeature, "psql postgresql://u:p@db.rgjsjesjvxcybprtmhrc.supabase.co:5432/postgres"],
    [onFeature, "curl https://rgjsjesjvxcybprtmhrc.supabase.co/rest/v1/profiles"],
    [onFeature, "node art-rider/check_db.js"],
    [onMain, "git push origin 2>&1"], [onMain, "git push origin > salida.txt"],
    [onFeature, "pnpm exec git push origin main 2>&1 | tail -3"], [onFeature, "cat /c/dev/_privado/a.txt"],
  ],
  ask: [
    [onFeature, "git push origin develop"], [onFeature, "git push -u origin HEAD:develop"],
    [onDevelop, "git push"], [onDevelop, "git merge feat/x"], [onDevelop, "git pull origin feat/x"],
    [onFeature, "git switch develop && git merge feat/x"], [onFeature, "cat .env"],
    [onFeature, "grep KEY art-rider/.env.local"], [onFeature, "supabase functions deploy kushki-charge"],
  ],
  pass: [
    [onFeature, "git push"], [onFeature, "git push -u origin feat/x"], [onDevelop, "git pull"],
    [onMain, "git pull --ff-only"], [onMain, "git status"], [onFeature, "git rebase main"],
    [onFeature, "git merge develop"], [onFeature, "git reset HEAD file.ts"], [onMain, "git merge --abort"],
    [onFeature, 'git commit -m "docs: no usar git push --force ni git reset --hard"'],
    [onFeature, "git commit -m \"$(cat <<'EOF'\nfix: algo\n\ngit push origin main (no)\nEOF\n)\""],
    [onFeature, "echo 'supabase db push'"], [onFeature, "supabase db reset"],
    [onFeature, "supabase db push --local"], [onFeature, "psql -h localhost -U postgres"],
    [onFeature, "node -e 'console.log(process.env.HOME)'"],
  ],
};

for (const [expected, cases] of Object.entries(CASES)) {
  for (const [cwd, command] of cases) {
    test(`${expected}: ${command}`, () => assert.equal(verdict(command, cwd), expected));
  }
}

const NEW_CASES = {
  deny: [
    "echo x > .claude/settings.json", "echo x>>.claude/hooks/guard.mjs", "rm .claude/hooks/guard.mjs",
    "rm -rf .claude", "rm -rf .", "mv .claude /tmp/x", "cp x.json .claude/settings.local.json",
    "sed -i s/deny/ask/ .claude/settings.json", "tee .claude/settings.json < x",
    "cd .claude && rm settings.json", "cd .claude/hooks; echo x > guard.mjs",
    "node -e \"require('fs').writeFileSync('.claude/settings.json','{}')\"",
    "python fix.py .claude/settings.json", "find .claude -name '*.mjs' -delete",
    "find .claude -type f | xargs rm", "bash -c 'rm .claude/settings.json'",
    "git checkout HEAD -- .claude/settings.json", "git restore .", "git rm -r .claude",
    "git diff --output=.claude/settings.json", "echo x > artrider-mobile/.claude/settings.json",
  ],
  ask: [
    "pnpm dlx expo-doctor@latest", "pnpm add zod", "pnpm -C art-rider add zod", "pnpm remove zod", "pnpm rm zod",
    "pnpm exec eslint .", "pnpm --dir art-rider exec next build", "pnpm install lodash",
    "pnpm i -D vitest", "git clean -fd", "git clean -n", "git -C . clean -x",
    "git worktree remove --force ../w", "git worktree remove ../w -f",
  ],
  pass: [
    "pnpm install", "pnpm install --frozen-lockfile", "pnpm exec tsc --noEmit", "pnpm lint", "pnpm test",
    "pnpm typecheck", "pnpm --dir art-rider exec tsc --noEmit", "git worktree remove ../w",
    "cat .claude/settings.json", "ls .claude/hooks 2>/dev/null", "grep deny .claude/settings.json | head",
    "node --test .claude/hooks/hooks.test.mjs", "git add .claude", "git diff -- .claude",
    'git commit -m "chore: protege .claude/"', "cat .claude/settings.json > copia.json",
    "echo x > ~/.claude/projects/p/memory/a.md", "rm -rf node_modules", "git restore src/a.ts",
  ],
};

for (const [expected, commands] of Object.entries(NEW_CASES)) {
  for (const command of commands) {
    test(`${expected}: ${command}`, () => assert.equal(verdict(command, withConfig), expected));
  }
}

test("PowerShell: escritura en .claude/", () => {
  const run = (command) => verdict(command, withConfig, "PowerShell");
  assert.equal(run("Set-Content -Path .claude\\settings.json -Value x"), "deny");
  assert.equal(run("'x' | Out-File .claude\\hooks\\guard.mjs"), "deny");
  assert.equal(run("Get-ChildItem .claude\\hooks | Remove-Item"), "deny");
  assert.equal(run("$p = '.claude\\settings.json'; Set-Content $p x"), "deny");
  assert.equal(run("[IO.File]::WriteAllText('.claude/settings.json', 'x')"), "deny");
  assert.equal(run("Remove-Item -Recurse -Force ."), "deny");
  assert.equal(run("Get-Content .claude\\settings.json"), "pass");
  assert.equal(run("pnpm add zod"), "ask");
});

test("herramientas que escriben en .claude/", () => {
  const run = (tool, input) => guard({ tool_name: tool, tool_input: input, cwd: withConfig })?.decision ?? "pass";
  for (const file of [".claude/settings.json", ".claude/settings.local.json", ".claude/hooks/lib/x.mjs"]) {
    for (const tool of ["Edit", "Write"]) assert.equal(run(tool, { file_path: path.join(withConfig, file) }), "deny");
  }
  assert.equal(run("NotebookEdit", { notebook_path: ".claude/a.ipynb" }), "deny");
  assert.equal(run("mcp__x__take_screenshot", { filePath: ".claude/hooks/guard.mjs" }), "deny");
  assert.equal(run("Read", { file_path: ".claude/settings.json" }), "pass");
  assert.equal(run("Write", { file_path: ".claude/worktrees/w1/src/a.ts" }), "pass");
  assert.equal(run("Write", { file_path: ".claude/worktrees/w1/.claude/settings.json" }), "deny");
  assert.equal(run("Write", { file_path: path.join(homedir(), ".claude", "projects", "m.md") }), "pass");
});

test("settings.json: reglas de permisos", () => {
  const { allow, ask, deny } = JSON.parse(readFileSync(new URL("../settings.json", import.meta.url))).permissions;
  for (const shell of ["Bash", "PowerShell"]) {
    assert.ok(!allow.includes(`${shell}(pnpm *)`));
    for (const rule of ["pnpm install", "pnpm exec tsc *", "pnpm lint *", "pnpm test *", "pnpm typecheck *"]) {
      assert.ok(allow.includes(`${shell}(${rule})`), rule);
    }
    for (const rule of ["pnpm dlx *", "pnpm add *", "pnpm remove *", "git clean *", "git worktree remove --force *"]) {
      assert.ok(ask.includes(`${shell}(${rule})`), rule);
    }
  }
  for (const target of ["settings.json", "settings.local.json", "hooks/**"]) {
    assert.ok(deny.includes(`Edit(/.claude/${target})`), target);
  }
});

test("PowerShell: separadores, here-strings y anidados", () => {
  assert.equal(verdict("git status; if ($?) { git push origin main }", onFeature, "PowerShell"), "deny");
  assert.equal(verdict("& git.exe reset --hard", onFeature, "PowerShell"), "deny");
  assert.equal(verdict(`Set-Location "${onMain}"; git merge feat/x`, onFeature, "PowerShell"), "deny");
  assert.equal(verdict("powershell -Command \"git push origin main\"", onFeature, "PowerShell"), "deny");
  assert.equal(verdict("git commit -m @'\ngit push --force\n'@", onFeature, "PowerShell"), "pass");
  assert.equal(verdict("Get-Content C:\\dev\\_privado\\x", onFeature, "PowerShell"), "deny");
});

test("herramientas de archivos: carpeta privada y .env", () => {
  const run = (tool, input) => guard({ tool_name: tool, tool_input: input, cwd: "C:\\dev\\ArtRider" })?.decision ?? "pass";
  assert.equal(run("Read", { file_path: "C:\\dev\\_privado\\a.txt" }), "deny");
  assert.equal(run("Write", { file_path: "..\\_privado\\a.txt", content: "x" }), "deny");
  assert.equal(run("Grep", { pattern: "x", path: "C:\\dev" }), "deny");
  assert.equal(run("Read", { file_path: "C:\\dev\\ArtRider\\artrider-mobile\\.env" }), "ask");
  assert.equal(run("Grep", { pattern: "_privado" }), "pass");
  assert.equal(run("Edit", { file_path: "C:\\dev\\ArtRider\\README.md", new_string: "_privado" }), "pass");
});

test("MCP de Supabase", () => {
  const run = (op, input = {}) =>
    guard({ tool_name: `mcp__plugin_supabase_supabase__${op}`, tool_input: input, cwd: onFeature })?.decision ?? "pass";
  assert.equal(run("execute_sql", { project_id: "rgjsjesjvxcybprtmhrc" }), "deny");
  assert.equal(run("apply_migration"), "deny");
  assert.equal(run("merge_branch", { branch_id: "b" }), "deny");
  assert.equal(run("execute_sql", { project_id: "otro" }), "ask");
  assert.equal(run("search_docs"), "pass");
});

test("gh pr merge según la rama base", () => {
  const withBase = (base) => checkGh({ args: ["pr", "merge", "7"], cwd: "." }, () => ({ status: 0, stdout: base }));
  assert.equal(withBase("main").decision, "deny");
  assert.equal(withBase("develop").decision, "ask");
  assert.equal(checkGh({ args: ["pr", "merge"], cwd: "." }, () => ({ status: 1 })).decision, "deny");
});

test("commit: solo revisa los paquetes con cambios y bloquea si tsc falla", () => {
  const { dir, run } = repo("feat/x");
  for (const name of ["art-rider", "artrider-mobile"]) mkdirSync(path.join(dir, name));
  writeFileSync(path.join(dir, "art-rider", "a.ts"), "x");
  const checked = [];
  const commit = (command, ok) => preCommit({ tool_name: "Bash", tool_input: { command }, cwd: dir },
    (d) => { checked.push(path.basename(d)); return { ok, output: "error TS" }; });

  assert.equal(commit('git commit -m "x"', false), null, "nada preparado");
  assert.equal(commit('git add -A && git commit -m "x"', false).decision, "deny");
  run("add", "art-rider/a.ts");
  assert.equal(commit('git commit -m "x"', false).decision, "deny");
  assert.equal(commit('git commit -m "x"', true), null);
  assert.deepEqual([...new Set(checked)], ["art-rider"]);
});

test("proceso real: exit 2 al bloquear, JSON al preguntar, bloqueo si la entrada es inválida", () => {
  const script = fileURLToPath(new URL("./guard.mjs", import.meta.url));
  const run = (input) => spawnSync(process.execPath, [script], { input, encoding: "utf8" });
  const event = (command) => JSON.stringify({ tool_name: "Bash", tool_input: { command }, cwd: onFeature });
  assert.equal(run(event("git reset --hard")).status, 2);
  assert.match(run(event("git push origin develop")).stdout, /"permissionDecision":"ask"/);
  assert.equal(run(event("git status")).stdout, "");
  assert.equal(run("no es json").status, 2);
});

test("commit y commit --amend bloqueados en develop y main", () => {
  for (const command of ['git commit -m "x"', "git commit --amend --no-edit"]) {
    for (const cwd of [onDevelop, onMain]) {
      const result = guard({ tool_name: "Bash", tool_input: { command }, cwd });
      assert.equal(result?.decision, "deny", command);
      assert.equal(result.reason, "No se commitea en develop ni en main: crea una rama desde develop");
    }
    assert.equal(verdict(command, onFeature), "pass", command);
  }
  assert.equal(verdict('git commit -m "x"', onDevelop, "PowerShell"), "deny");
  assert.equal(verdict('git switch develop && git commit -m "x"', onFeature), "deny");
  assert.equal(verdict('git switch -c feat/y && git commit -m "x"', onDevelop), "pass");
});

test("gh api: escrituras y merges piden permiso; lecturas pasan", () => {
  const asks = [
    "gh api -X POST repos/o/r/pulls/1/reviews", "gh api --method PUT repos/o/r/pulls/1/merge",
    "gh api --method=patch repos/o/r/pulls/1", "gh api -XDELETE repos/o/r/git/refs/heads/x",
    "gh api repos/o/r/issues/1/comments -f body=hola", "gh api graphql -F query=@q.graphql",
    "gh api repos/o/r/pulls --input pr.json", "gh api repos/o/r/pulls/1/merge", "gh api repos/o/r/merges",
    "gh api repos/o/r/pulls/$N",
  ];
  const passes = [
    "gh api repos/o/r/pulls/1", "gh api -X GET repos/o/r/pulls", "gh api --method GET repos/o/r/commits",
    "gh api repos/o/r/pulls --jq '.[0].number'", "gh api user", "gh pr view 20",
  ];
  for (const command of asks) assert.equal(verdict(command, onFeature), "ask", command);
  for (const command of passes) assert.equal(verdict(command, onFeature), "pass", command);
  assert.equal(verdict("gh api -X POST repos/o/r/merges", onFeature, "PowerShell"), "ask");
});
