// Análisis de comandos Bash / PowerShell: los convierte en invocaciones
// { name, args, cwd, branches } para que las reglas no dependan de texto plano.
import { spawnSync } from "node:child_process";
import path from "node:path";

/** Divide un comando en segmentos { words, sep }. Las sustituciones $(...) se añaden como segmentos. */
export function parse(source, shell) {
  const src = source.replace(/\r\n/g, "\n");
  const escapeChar = shell === "PowerShell" ? "`" : "\\";
  const segments = [];
  let pos = 0;

  function readHeredocs(pending) {
    for (const { tag, segment } of pending.splice(0)) {
      const body = [];
      while (pos < src.length) {
        const end = src.indexOf("\n", pos);
        const line = src.slice(pos, end === -1 ? src.length : end);
        pos = end === -1 ? src.length : end + 1;
        if (line.trim() === tag) break;
        body.push(line);
      }
      segment.heredoc = body.join("\n");
    }
  }

  function readQuoted(quote) {
    let text = "";
    pos += 1;
    while (pos < src.length && src[pos] !== quote) {
      if (quote === '"' && src[pos] === escapeChar && '"\\$`\n'.includes(src[pos + 1])) {
        text += src[pos + 1];
        pos += 2;
      } else if (quote === '"' && src.startsWith("$(", pos)) {
        pos += 2;
        readList(")");
        text += "$()";
      } else {
        text += src[pos];
        pos += 1;
      }
    }
    pos += 1;
    return text;
  }

  function readList(closer) {
    let words = [];
    let word = null;
    let segment = {};
    const heredocs = [];
    const push = (text) => { word = (word ?? "") + text; };
    const endWord = () => {
      if (word !== null) words.push(word);
      word = null;
    };
    const endSegment = (sep) => {
      endWord();
      if (words.length) segments.push(Object.assign(segment, { words, sep }));
      words = [];
      segment = {};
    };

    while (pos < src.length) {
      const c = src[pos];
      const rest = src.slice(pos, pos + 3);
      if (closer && c === closer) { pos += 1; break; }
      const hereString = shell === "PowerShell" && /^@['"]\n/.test(rest);
      const heredoc = shell !== "PowerShell" && /^<<-?\s*(['"]?)([A-Za-z_]\w*)\1/.exec(src.slice(pos, pos + 80));
      if (hereString) {
        const end = src.indexOf(`\n${src[pos + 1]}@`, pos + 2);
        push(src.slice(pos + 3, end === -1 ? src.length : end));
        pos = end === -1 ? src.length : end + 3;
      } else if (src.startsWith("<<<", pos)) { pos += 3; }
      else if (heredoc) {
        heredocs.push({ tag: heredoc[2], segment });
        pos += heredoc[0].length;
      } else if (c === "'" || c === '"') { push(readQuoted(c)); }
      else if (c === escapeChar) {
        if (src[pos + 1] !== "\n") push(src[pos + 1] ?? "");
        pos += 2;
      } else if (rest.startsWith("$(")) { pos += 2; readList(")"); push("$()"); }
      else if (c === "`") { pos += 1; readList("`"); push("$()"); }
      else if (c === "(") { endSegment(";"); pos += 1; readList(")"); }
      else if (c === "#" && word === null) {
        while (pos < src.length && src[pos] !== "\n") pos += 1;
      } else if (c === "\n") {
        endSegment(";");
        pos += 1;
        readHeredocs(heredocs);
      } else if (rest.startsWith("&&")) { endSegment("&&"); pos += 2; }
      else if (c === "&" && (src[pos - 1] === ">" || src[pos + 1] === ">")) { push(c); pos += 1; }
      else if (c === ";" || c === "|" || c === "&") { endSegment(c); pos += 1; }
      else if ((c === "{" || c === "}") && (word === null || /^\s?$/.test(src[pos + 1] ?? ""))) {
        if (word !== null && word.includes("{")) { push(c); pos += 1; }
        else { endSegment(";"); pos += 1; }
      } else if (c === " " || c === "\t") { endWord(); pos += 1; }
      else if (c === ">" && word !== null && !/^([0-9]|[&*])?>*$/.test(word)) { endWord(); }
      else { push(c); pos += 1; }
    }
    endSegment(";");
  }

  readList(null);
  return segments;
}

export function git(cwd, args) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : null;
}

export function toPath(cwd, target) {
  const windows = target.replace(/^\/([a-zA-Z])(\/|$)/, "$1:/");
  return path.resolve(cwd, windows);
}

const baseName = (word) => word.split(/[\\/]/).pop().toLowerCase().replace(/\.(exe|cmd|bat|ps1)$/, "");
const PREFIXES = new Set(["command", "builtin", "time", "nice", "nohup", "stdbuf", "timeout", "sudo",
  "env", "winpty", "if", "then", "else", "elif", "do", "while", "until", "!", "."]);
const CD = new Set(["cd", "chdir", "pushd", "set-location", "sl", "push-location"]);
const RUNNERS = new Set(["npx", "bunx", "pnpx"]);

/** Archivos escritos mediante redirección (> destino, 2>> destino). */
function redirectTargets(words) {
  return words.flatMap((w, i) => {
    const match = /^([0-9]|[&*])?>>?(.*)$/.exec(w);
    const target = match ? match[2] || words[i + 1] || "" : "";
    return !target || /^(&[0-9-]|\/dev\/null|\$null|nul)$/i.test(target) ? [] : [target];
  });
}

/** Elimina redirecciones (2>&1, > salida.txt) para que no cuenten como argumentos. */
function dropRedirects(words) {
  const operator = /^([0-9]|[&*])?(>>?|<)/;
  const bare = /^([0-9]|[&*])?(>>?|<)$/;
  return words.filter((w, i) => !operator.test(w) && !bare.test(words[i - 1] ?? ""));
}

/** Quita asignaciones, palabras clave y envoltorios que preceden al programa real. */
function stripPrefixes(words) {
  let i = 0;
  while (i < words.length) {
    const w = words[i];
    if (/^(\$?[\w:]+)\+?=/.test(w)) i += 1;
    else if (/^\$[\w:]+$/.test(w) && words[i + 1] === "=") i += 2;
    else if (PREFIXES.has(w.toLowerCase())) {
      i += 1;
      while (i < words.length && /^(-|\d)/.test(words[i])) i += 1;
    } else break;
  }
  return words.slice(i);
}

/** Si el programa ejecuta otro comando (bash -c, iex, xargs...), devuelve ese comando. */
function nestedCommand(name, args, heredoc) {
  const after = (test) => {
    const i = args.findIndex(test);
    return i === -1 ? null : args.slice(i + 1).join(" ");
  };
  if (["bash", "sh", "zsh"].includes(name)) {
    return { text: after((a) => /^-[a-z]*c$/.test(a)) ?? heredoc, shell: "Bash" };
  }
  if (["powershell", "pwsh"].includes(name)) {
    if (args.some((a) => /^[-/]e(c|n[a-z]*)?$/i.test(a))) return { encoded: true };
    return { text: after((a) => /^[-/]c(o(m(m(a(nd?)?)?)?)?)?$/i.test(a)) ?? args.join(" "), shell: "PowerShell" };
  }
  if (name === "cmd") return { text: after((a) => /^\/{1,2}[ck]$/i.test(a)), shell: "Bash" };
  if (["eval", "iex", "invoke-expression"].includes(name)) return { text: args.join(" ") };
  if (["xargs", "start-process", "saps", "start"].includes(name)) {
    return { text: args.filter((a) => !a.startsWith("-")).join(" ").replace(/,/g, " ") };
  }
  if (name === "find") return { text: after((a) => a === "-exec" || a === "-execdir") };
  return null;
}

/** pnpm exec X / pnpm dlx X / npx X -> X */
function unwrapRunner(name, args) {
  if (name !== "pnpm" && !RUNNERS.has(name)) return null;
  let i = 0;
  let cwdArg = null;
  while (i < args.length && args[i].startsWith("-")) {
    const takesValue = ["-C", "--dir", "--filter", "-F", "--package"].includes(args[i]);
    if (args[i] === "-C" || args[i] === "--dir") cwdArg = args[i + 1];
    i += takesValue ? 2 : 1;
  }
  if (name === "pnpm" && (args[i] === "exec" || args[i] === "dlx")) i += 1;
  else if (name === "pnpm" && !/^supabase(@|$)/.test(args[i] ?? "")) return null;
  while (i < args.length && args[i].startsWith("-")) i += 1;
  return i < args.length ? { words: args.slice(i), cwdArg } : null;
}

const GIT_VALUE_OPTIONS = new Set(["-C", "-c", "--git-dir", "--work-tree", "--namespace", "--config-env"]);

function parseGit(args, cwd) {
  let i = 0;
  let dir = cwd;
  let inlineAlias = false;
  while (i < args.length && args[i].startsWith("-")) {
    if (args[i] === "-C") dir = toPath(dir, args[i + 1] ?? ".");
    if (args[i] === "-c" && /^alias\./i.test(args[i + 1] ?? "")) inlineAlias = true;
    i += GIT_VALUE_OPTIONS.has(args[i]) ? 2 : 1;
  }
  return { sub: args[i] ?? "", args: args.slice(i + 1), cwd: dir, inlineAlias };
}

/** Rama que quedaría activa tras `git switch` / `git checkout`, o null si no cambia de rama. */
function switchTarget({ sub, args, cwd }) {
  if (sub !== "switch" && sub !== "checkout") return null;
  const created = args.findIndex((a) => /^(-[bBcC]|--create|--force-create|--orphan)$/.test(a));
  if (created !== -1) return args[created + 1] ?? null;
  const positional = args.filter((a) => a === "-" || !a.startsWith("-"));
  if (args.includes("--") || positional.length !== 1) return null;
  const target = positional[0];
  if (target === "-") return git(cwd, ["rev-parse", "--abbrev-ref", "@{-1}"]) ?? "main";
  const isBranch = sub === "switch"
    || git(cwd, ["rev-parse", "--verify", "-q", `refs/heads/${target}`]) !== null
    || git(cwd, ["rev-parse", "--verify", "-q", `refs/remotes/origin/${target}`]) !== null;
  return isBranch ? target : null;
}

/** Recorre un comando completo siguiendo `cd` y cambios de rama. */
export function analyze(command, { cwd, shell }, state = { cwd, branches: null }, depth = 0) {
  if (depth > 5) return [{ name: "opaque", args: [], cwd: state.cwd }];
  const found = [];
  for (const segment of parse(command, shell)) {
    let words = stripPrefixes(dropRedirects(segment.words));
    let runCwd = state.cwd;
    const targets = redirectTargets(segment.words);
    if (targets.length) found.push({ name: "redirect", args: targets, cwd: runCwd });
    // pnpm se registra antes de desenvolver "exec"/"dlx" para poder juzgar la orden completa.
    if (words.length && baseName(words[0]) === "pnpm") {
      found.push({ name: "pnpm-cli", args: words.slice(1), cwd: runCwd });
    }
    for (let hop = 0; hop < 4 && words.length; hop += 1) {
      const inner = unwrapRunner(baseName(words[0]), words.slice(1));
      if (!inner) break;
      if (inner.cwdArg) runCwd = toPath(runCwd, inner.cwdArg);
      words = inner.words;
    }
    if (!words.length) continue;
    const name = baseName(words[0]).replace(/^supabase@.*/, "supabase");
    const args = words.slice(1);
    const nested = nestedCommand(name, args, segment.heredoc);
    if (nested?.encoded) found.push({ name: "opaque", args, cwd: runCwd });
    else if (nested?.text) {
      found.push(...analyze(nested.text, { cwd: runCwd, shell: nested.shell ?? shell }, state, depth + 1));
    } else if (CD.has(name)) {
      const target = args.find((a) => !a.startsWith("-") && a.toLowerCase() !== "/d");
      if (target) state.cwd = toPath(state.cwd, target);
    } else if (name === "git") {
      found.push(...gitInvocations(parseGit(args, runCwd), segment, state, shell, depth));
    } else found.push({ name, args, cwd: runCwd });
  }
  return found;
}

function gitInvocations(call, segment, state, shell, depth) {
  const alias = call.sub && git(call.cwd, ["config", "--get", `alias.${call.sub}`]);
  if (alias) {
    const text = alias.startsWith("!") ? alias.slice(1) : `git ${alias}`;
    return analyze(`${text} ${call.args.join(" ")}`, { cwd: call.cwd, shell: "Bash" }, state, depth + 1);
  }
  const current = git(call.cwd, ["symbolic-ref", "--short", "-q", "HEAD"]);
  const branches = state.branches ?? (current ? [current] : []);
  const target = switchTarget(call);
  // Sin "&&" el cambio de rama puede fallar y el resto correr en la rama anterior.
  if (target) state.branches = segment.sep === "&&" ? [target] : [...new Set([...branches, target])];
  return [{ name: "git", ...call, branches }];
}
