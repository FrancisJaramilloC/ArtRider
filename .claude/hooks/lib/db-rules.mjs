// Reglas contra la base de datos de producción (CLI, clientes SQL, HTTP y MCP).
export const PROD_REF = "rgjsjesjvxcybprtmhrc";

const deny = (reason) => ({ decision: "deny", reason });
const ask = (reason) => ({ decision: "ask", reason });

const REMOTE_HOST = new RegExp(`${PROD_REF}|\\.supabase\\.(co|com|in)`, "i");
const LOCAL_HOST = /(@|\/\/|host=|^)(localhost|127\.0\.0\.1|\[::1\])([:/\s]|$)/i;
const SQL_CLIENTS = new Set(["psql", "pg_dump", "pg_dumpall", "pg_restore", "pgcli"]);
const HTTP_CLIENTS = new Set(["curl", "wget", "irm", "iwr", "invoke-restmethod", "invoke-webrequest", "http"]);
/** Scripts del repo que leen .env y consultan producción. */
const PROD_SCRIPTS = /(^|[\\/])(check_db|check_items|check_packages|test_packages)\.(js|ts|mjs)$/;
const VALUE_FLAGS = new Set(["--workdir", "--profile", "-o", "--output", "--network-id", "--dns-resolver",
  "--project-ref", "--db-url", "-p", "--password", "--schema", "-s", "-f", "--file"]);

function checkSupabase(args) {
  const words = args.filter((a, i) => !a.startsWith("-") && !VALUE_FLAGS.has(args[i - 1]));
  const [group, action] = words;
  const urlAt = args.findIndex((a) => a === "--db-url" || a.startsWith("--db-url="));
  const url = urlAt === -1 ? null : args[urlAt].split("=").slice(1).join("=") || args[urlAt + 1] || "";
  const local = args.includes("--local") || (url !== null && LOCAL_HOST.test(url));
  const blocked = (what) => deny(`${what} apunta (o puede apuntar) a la base de producción.`);

  if (words.some((w) => w.includes("$"))) return deny("subcomando de supabase dinámico: escríbelo literalmente.");
  if (group === "db" && action === "push" && !local) return blocked("supabase db push");
  if (url !== null && !local) return blocked("supabase --db-url remoto");
  if (args.some((a) => a === "--linked" || a.startsWith("--linked="))) return blocked("supabase --linked");
  if (group === "db" && ["pull", "dump", "remote"].includes(action) && !local) return blocked(`supabase db ${action}`);
  if (group === "migration" && ["list", "repair", "fetch", "squash"].includes(action) && !local) {
    return blocked(`supabase migration ${action}`);
  }
  if ((group === "inspect" || group === "storage") && !local) return blocked(`supabase ${group}`);
  if (group === "config" && action === "push") return blocked("supabase config push");
  const touchesProject = (group === "functions" && ["deploy", "delete"].includes(action))
    || (group === "secrets" && ["set", "unset"].includes(action));
  return touchesProject ? ask(`supabase ${group} ${action} modifica el proyecto remoto.`) : null;
}

export function checkDatabase({ name, args }) {
  if (name === "supabase") return checkSupabase(args);
  const text = args.join(" ");
  if (SQL_CLIENTS.has(name) && !args.some((a) => LOCAL_HOST.test(a))) {
    return deny(`${name} sin host local explícito: puede conectar a producción.`);
  }
  if (HTTP_CLIENTS.has(name) && new RegExp(PROD_REF, "i").test(text)) {
    return deny("petición HTTP al proyecto de producción.");
  }
  if (args.some((a) => /^postgres(ql)?:\/\//i.test(a) && REMOTE_HOST.test(a))) {
    return deny("cadena de conexión a una base remota de Supabase.");
  }
  if (["node", "tsx", "ts-node", "bun", "deno"].includes(name) && args.some((a) => PROD_SCRIPTS.test(a))) {
    return deny("este script consulta la base de producción.");
  }
  return null;
}

const MCP_SAFE = new Set(["search_docs", "get_project", "get_project_url", "get_publishable_keys",
  "list_projects", "list_organizations", "get_organization", "list_branches", "list_edge_functions",
  "get_edge_function", "authenticate", "complete_authentication"]);
const MCP_NEVER = new Set(["merge_branch", "reset_branch", "rebase_branch", "delete_branch",
  "pause_project", "restore_project", "run_notebook"]);
const MCP_DATABASE = new Set(["execute_sql", "apply_migration", "list_tables", "list_extensions",
  "list_migrations", "get_advisors", "generate_typescript_types", "query_logs", "get_logs"]);

export function checkSupabaseMcp(toolName, input) {
  const operation = toolName.split("__").pop();
  if (MCP_SAFE.has(operation)) return null;
  if (MCP_NEVER.has(operation)) return deny(`${operation} (MCP Supabase) puede afectar a producción.`);
  const projectId = input.project_id ?? input.project_ref;
  if (MCP_DATABASE.has(operation) && (!projectId || projectId === PROD_REF)) {
    return deny(`${operation} (MCP Supabase) contra la base de producción.`);
  }
  return ask(`${operation} (MCP Supabase) actúa sobre un proyecto remoto.`);
}
