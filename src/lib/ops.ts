import { OpMcp, OpMcpError, EXPECTED_TOOLS, BINARY_CANDIDATES, SETUP_HINT, resolveBinaryPath } from "./opmcp";

/**
 * Shared handlers behind every command and Local API route.
 * Each handler opens one short-lived 1password-mcp session, runs one
 * operation, and closes the session.
 *
 * SECRETS POLICY (enforced here, audited): no handler returns a secret value.
 * append_variables is the only value path and it is one-way (into the vault).
 * list_variables returns names only, by the server's design. Mounted .env
 * files are never read back by this plugin.
 */

export interface Options {
    account_id?: string;
    binary_path?: string;
    input_text?: string;
    [key: string]: any;
}

export interface VariableInput {
    name: string;
    value: string;
    concealed?: boolean;
}

function mergedOptions(options: Options): Options {
    // SmartBar/text callers may pass a JSON object in input_text; merge it.
    if (typeof options?.input_text === "string" && options.input_text.trim().startsWith("{")) {
        try {
            const extra = JSON.parse(options.input_text);
            if (extra && typeof extra === "object") return { ...extra, ...options, input_text: undefined };
        } catch {}
    }
    return options;
}

async function withSession<T>(options: Options, fn: (m: OpMcp) => Promise<T>): Promise<T> {
    const client = await OpMcp.connect(typeof options.binary_path === "string" ? options.binary_path : undefined);
    try {
        return await fn(client);
    } finally {
        client.close();
    }
}

/** Resolve the 1Password account id: explicit override, else authenticate (which the app answers without exposing secrets). */
async function accountId(m: OpMcp, override?: string): Promise<string> {
    if (override && String(override).trim()) return String(override).trim();
    const res = await m.callTool("authenticate", {}, 30000);
    let id: string | undefined;
    if (res && typeof res === "object") id = res.account_id;
    else if (typeof res === "string") {
        try { id = JSON.parse(res)?.account_id; } catch {}
    }
    if (!id) {
        throw new OpMcpError("Could not resolve the 1Password account id", "Unlock the 1Password app and approve the access prompt, or set Account ID in the plugin settings.");
    }
    return String(id);
}

interface EnvListResult {
    environments?: any[];
    [k: string]: any;
}

function environmentList(raw: any): any[] {
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw?.environments)) return raw.environments;
    if (Array.isArray(raw?.items)) return raw.items;
    return [];
}

function envName(e: any): string {
    return String(e?.name ?? e?.environmentName ?? e?.environment_name ?? "");
}

function envId(e: any): string {
    return String(e?.id ?? e?.environmentId ?? e?.environment_id ?? "");
}

async function resolveEnvironment(m: OpMcp, acct: string, environment: string): Promise<{ id: string; name: string }> {
    const raw: EnvListResult = await m.callTool("list_environments", { accountId: acct });
    const list = environmentList(raw);
    const key = String(environment).trim().toLowerCase();
    const hit = list.find((e) => envId(e) === String(environment).trim())
        ?? list.find((e) => envName(e).toLowerCase() === key);
    if (!hit) {
        const names = list.map((e) => envName(e)).filter(Boolean).join(", ");
        throw new OpMcpError("Environment '" + environment + "' not found", names ? "Available Environments: " + names : "No Environments exist yet — create one first.");
    }
    return { id: envId(hit), name: envName(hit) };
}

export async function listEnvironments(options: Options): Promise<any> {
    options = mergedOptions(options);
    return withSession(options, async (m) => {
        const acct = await accountId(m, options.account_id);
        const raw = await m.callTool("list_environments", { accountId: acct });
        const list = environmentList(raw);
        return { account_id: acct, count: list.length, environments: list.map((e) => ({ id: envId(e), name: envName(e) })) };
    });
}

export async function createEnvironment(options: Options & { environmentName?: string; name?: string }): Promise<any> {
    options = mergedOptions(options);
    const envName2 = String(options.environmentName ?? options.name ?? "").trim();
    if (!envName2) throw new OpMcpError("environmentName is required");
    return withSession(options, async (m) => {
        const acct = await accountId(m, options.account_id);
        await m.callTool("create_environment", { accountId: acct, environmentName: envName2 });
        return { created: envName2, account_id: acct };
    });
}

export async function renameEnvironment(options: Options & { environment?: string; newName?: string; environmentName?: string }): Promise<any> {
    options = mergedOptions(options);
    const target = String(options.environment ?? "").trim();
    const newName = String(options.newName ?? options.environmentName ?? "").trim();
    if (!target) throw new OpMcpError("environment (name or id) is required");
    if (!newName) throw new OpMcpError("newName is required");
    return withSession(options, async (m) => {
        const acct = await accountId(m, options.account_id);
        const env = await resolveEnvironment(m, acct, target);
        await m.callTool("rename_environment", { accountId: acct, environmentId: env.id, environmentName: newName });
        return { renamed: { from: env.name, to: newName } };
    });
}

export async function listVariables(options: Options & { environment?: string }): Promise<any> {
    options = mergedOptions(options);
    const target = String(options.environment ?? "").trim();
    if (!target) throw new OpMcpError("environment (name or id) is required");
    return withSession(options, async (m) => {
        const acct = await accountId(m, options.account_id);
        const env = await resolveEnvironment(m, acct, target);
        const raw = await m.callTool("list_variables", { accountId: acct, environmentId: env.id });
        // By the server's design this returns variable NAMES only — never values.
        // Server shape: { "variableNames": ["NAME", ...] }
        const names = Array.isArray(raw?.variableNames)
            ? raw.variableNames.map((v: any) => (typeof v === "string" ? v : String(v?.name ?? "")))
            : environmentList(raw).map((v: any) => (typeof v === "string" ? v : String(v?.name ?? v?.variableName ?? "")));
        return { environment: env.name, count: names.filter(Boolean).length, variables: names.filter(Boolean) };
    });
}

export async function appendVariables(options: Options & { environment?: string; variables?: VariableInput[] }): Promise<any> {
    options = mergedOptions(options);
    const target = String(options.environment ?? "").trim();
    if (!target) throw new OpMcpError("environment (name or id) is required");
    const vars = options.variables;
    if (!Array.isArray(vars) || vars.length === 0) throw new OpMcpError("variables must be a non-empty array of { name, value, concealed? }");
    const cleaned = vars.map((v, i) => {
        const name = String(v?.name ?? "").trim();
        const value = String(v?.value ?? "");
        if (!name) throw new OpMcpError("variables[" + i + "].name is required");
        // Values flow INTO the vault only; they are never echoed back by this plugin.
        return { name, value, concealed: typeof v?.concealed === "boolean" ? v.concealed : true };
    });
    return withSession(options, async (m) => {
        const acct = await accountId(m, options.account_id);
        const env = await resolveEnvironment(m, acct, target);
        await m.callTool("append_variables", { accountId: acct, environmentId: env.id, variables: cleaned });
        return { environment: env.name, added: cleaned.map((v) => v.name) };
    });
}

export async function createLocalEnvFile(options: Options & { environment?: string; mountPath?: string }): Promise<any> {
    options = mergedOptions(options);
    const target = String(options.environment ?? "").trim();
    const mountPath = String(options.mountPath ?? "").trim();
    if (!target) throw new OpMcpError("environment (name or id) is required");
    if (!mountPath) throw new OpMcpError("mountPath (absolute path for the mounted .env file) is required");
    if (!mountPath.startsWith("/")) throw new OpMcpError("mountPath must be an absolute path");
    return withSession(options, async (m) => {
        const acct = await accountId(m, options.account_id);
        const env = await resolveEnvironment(m, acct, target);
        await m.callTool("create_local_env_file", { accountId: acct, environmentId: env.id, environmentName: env.name, mountPath });
        return { mounted: mountPath, environment: env.name, note: "The mount resolves secret values on demand inside processes; never read this file into a chat or agent context." };
    });
}

export async function listLocalEnvFiles(options: Options & { environment?: string }): Promise<any> {
    options = mergedOptions(options);
    const target = String(options.environment ?? "").trim();
    if (!target) throw new OpMcpError("environment (name or id) is required");
    return withSession(options, async (m) => {
        const acct = await accountId(m, options.account_id);
        const env = await resolveEnvironment(m, acct, target);
        const raw = await m.callTool("list_local_env_files", { accountId: acct, environmentId: env.id });
        // Server shape: { "localEnvFiles": [{ id, mountPath, isEnabled }] }
        const files = Array.isArray(raw?.localEnvFiles)
            ? raw.localEnvFiles.map((f: any) => (typeof f === "string" ? f : String(f?.mountPath ?? f?.path ?? ""))).filter(Boolean)
            : environmentList(raw).map((f: any) => (typeof f === "string" ? f : String(f?.mountPath ?? f?.path ?? f?.file ?? ""))).filter(Boolean);
        return { environment: env.name, count: files.length, mounts: files };
    });
}

export interface DoctorCheck {
    check: string;
    status: "pass" | "fail";
    detail: string;
    fix?: string;
}

export async function doctor(options: Options): Promise<{ ok: boolean; checks: DoctorCheck[] }> {
    options = mergedOptions(options);
    const checks: DoctorCheck[] = [];
    const add = (check: string, status: "pass" | "fail", detail: string, fix?: string) => checks.push({ check, status, detail, fix });

    // 1. Binary resolvable
    const override = typeof options.binary_path === "string" ? options.binary_path : undefined;
    const bin = resolveBinaryPath(override);
    if (bin) {
        add("binary", "pass", "1password-mcp found at " + bin);
    } else {
        add("binary", "fail", "1password-mcp not found (searched: " + [override, ...BINARY_CANDIDATES].filter(Boolean).join(", ") + ")", SETUP_HINT);
        return { ok: false, checks };
    }

    // 2. Handshake
    let m: OpMcp;
    try {
        m = await OpMcp.connect(override);
        add("initialize", "pass", "Server answered initialize" + (m.serverInfo?.version ? " (" + m.serverInfo.name + " " + m.serverInfo.version + ")" : ""));
    } catch (e: any) {
        add("initialize", "fail", e.message, e.hint ?? SETUP_HINT);
        return { ok: false, checks };
    }

    try {
        // 3. Tool surface
        try {
            const tools = await m.listTools();
            const missing = EXPECTED_TOOLS.filter((t) => !tools.includes(t));
            if (missing.length === 0) {
                add("tools", "pass", "All " + EXPECTED_TOOLS.length + " expected Environments tools present");
            } else {
                add("tools", "fail", "Missing tools: " + missing.join(", ") + " — update the 1Password app", "Update 1Password to the latest version.");
            }
        } catch (e: any) {
            add("tools", "fail", e.message, e.hint);
        }

        // 4. Authenticate + 5. Environments round-trip (may show an approval prompt in the 1Password app)
        let acct = "";
        try {
            acct = await accountId(m, options.account_id);
            add("authenticate", "pass", "Authenticated account " + acct);
        } catch (e: any) {
            add("authenticate", "fail", e.message, e.hint ?? "Unlock the 1Password app and approve the access prompt.");
        }
        if (acct) {
            try {
                const raw = await m.callTool("list_environments", { accountId: acct }, 60000);
                const list = environmentList(raw);
                add("environments", "pass", "Environments reachable (" + list.length + " found)");
            } catch (e: any) {
                add("environments", "fail", e.message, "Approve the 1Password access prompt. If your plan or an enterprise policy (Policies > Agentic permissions) disables the local MCP server, this check cannot pass.");
            }
        }
    } finally {
        m.close();
    }

    return { ok: checks.every((c) => c.status === "pass"), checks };
}
