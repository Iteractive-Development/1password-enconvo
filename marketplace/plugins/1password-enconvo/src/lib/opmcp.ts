import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

/**
 * Minimal stdio MCP client for the 1Password Environments MCP server.
 *
 * SECURITY MODEL: this client only carries operations that never return a
 * secret value. The 1Password server enforces this by design (variable values
 * are write-only; list_variables returns names only; mounted .env files are
 * resolved inside processes, never returned to the caller).
 */

export const EXPECTED_TOOLS = [
    "authenticate",
    "list_environments",
    "create_environment",
    "rename_environment",
    "append_variables",
    "list_variables",
    "create_local_env_file",
    "list_local_env_files",
];

export const BINARY_CANDIDATES = [
    "/usr/local/bin/1password-mcp",
    "/opt/homebrew/bin/1password-mcp",
    "/Applications/1Password.app/Contents/MacOS/1password-mcp",
];

export const SETUP_HINT =
    "Fix: install 1Password from https://1password.com/downloads, open 1Password > Settings > Developer and enable 'Integrate with MCP clients', then make sure the 1Password app is running.";

export class OpMcpError extends Error {
    readonly hint?: string;
    constructor(message: string, hint?: string) {
        super(message);
        this.name = "OpMcpError";
        this.hint = hint;
    }
}

export function resolveBinaryPath(override?: string): string | null {
    if (override && typeof override === "string" && override.trim() && existsSync(override.trim())) {
        return override.trim();
    }
    for (const p of BINARY_CANDIDATES) {
        if (existsSync(p)) return p;
    }
    return null;
}

interface Pending {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
    timer: NodeJS.Timeout;
}

export class OpMcp {
    private proc: ReturnType<typeof spawn> | null = null;
    private buffer = "";
    private pending = new Map<number, Pending>();
    private nextId = 1;

    serverInfo: any = null;
    tools: string[] = [];

    private constructor(readonly binaryPath: string) {}

    static async connect(binaryOverride?: string, timeoutMs = 15000): Promise<OpMcp> {
        const bin = resolveBinaryPath(binaryOverride);
        if (!bin) {
            throw new OpMcpError("1password-mcp binary not found on this Mac", SETUP_HINT);
        }
        const client = new OpMcp(bin);
        await client.start(timeoutMs);
        return client;
    }

    private start(timeoutMs: number): Promise<void> {
        return new Promise((resolve, reject) => {
            let child: ReturnType<typeof spawn>;
            try {
                child = spawn(this.binaryPath, [], { stdio: ["pipe", "pipe", "pipe"] });
            } catch (e: any) {
                reject(new OpMcpError("Failed to start 1password-mcp: " + e.message, SETUP_HINT));
                return;
            }
            this.proc = child;
            child.stdout?.on("data", (chunk: Buffer) => this.onData(String(chunk)));
            child.stderr?.on("data", () => {});
            child.on("exit", (code) => {
                this.rejectAll(new OpMcpError("1password-mcp exited unexpectedly (code " + code + ")", SETUP_HINT));
            });
            child.on("error", (e) => {
                this.rejectAll(new OpMcpError("1password-mcp could not start: " + e.message, SETUP_HINT));
            });
            const guard = setTimeout(() => {
                reject(new OpMcpError("1password-mcp did not answer initialize within " + timeoutMs + "ms", SETUP_HINT));
            }, timeoutMs + 2000);
            this.request("initialize", {
                protocolVersion: "2024-11-05",
                capabilities: {},
                clientInfo: { name: "1password-enconvo", version: "1.0.0" },
            }, timeoutMs)
                .then((result) => {
                    this.serverInfo = result?.serverInfo ?? null;
                    this.notify("notifications/initialized");
                    clearTimeout(guard);
                    resolve();
                })
                .catch((e) => {
                    clearTimeout(guard);
                    reject(e);
                });
        });
    }

    private onData(chunk: string): void {
        this.buffer += chunk;
        let idx: number;
        while ((idx = this.buffer.indexOf("\n")) >= 0) {
            const line = this.buffer.slice(0, idx).trim();
            this.buffer = this.buffer.slice(idx + 1);
            if (!line) continue;
            let msg: any;
            try {
                msg = JSON.parse(line);
            } catch {
                continue;
            }
            if (msg && typeof msg.id === "number" && this.pending.has(msg.id)) {
                const p = this.pending.get(msg.id)!;
                this.pending.delete(msg.id);
                clearTimeout(p.timer);
                if (msg.error) {
                    p.reject(new OpMcpError(String(msg.error.message ?? "MCP error " + msg.error.code)));
                } else {
                    p.resolve(msg.result);
                }
            }
        }
    }

    private request(method: string, params: any, timeoutMs: number): Promise<any> {
        return new Promise((resolve, reject) => {
            const id = this.nextId++;
            const timer = setTimeout(() => {
                this.pending.delete(id);
                reject(new OpMcpError(method + " timed out after " + timeoutMs + "ms — is the 1Password app running and unlocked?"));
            }, timeoutMs);
            this.pending.set(id, { resolve, reject, timer });
            try {
                this.proc?.stdin?.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
            } catch (e: any) {
                clearTimeout(timer);
                this.pending.delete(id);
                reject(new OpMcpError("Could not write to 1password-mcp: " + e.message, SETUP_HINT));
            }
        });
    }

    private notify(method: string): void {
        try {
            this.proc?.stdin?.write(JSON.stringify({ jsonrpc: "2.0", method }) + "\n");
        } catch {}
    }

    async listTools(timeoutMs = 20000): Promise<string[]> {
        const result = await this.request("tools/list", {}, timeoutMs);
        this.tools = (result?.tools ?? []).map((t: any) => String(t.name));
        return this.tools;
    }

    /**
     * Call an MCP tool and return its parsed first text content.
     * Tool errors (isError) are thrown as OpMcpError with the server's message.
     */
    async callTool(name: string, args: any = {}, timeoutMs = 45000): Promise<any> {
        const result = await this.request("tools/call", { name, arguments: args }, timeoutMs);
        if (result?.isError) {
            const text = (result?.content ?? []).map((c: any) => String(c.text ?? "")).join(" ").trim();
            throw new OpMcpError(text || "1Password tool '" + name + "' failed");
        }
        const text = (result?.content ?? []).map((c: any) => String(c.text ?? "")).join("\n");
        try {
            return JSON.parse(text);
        } catch {
            return text;
        }
    }

    close(): void {
        try { this.proc?.stdin?.end(); } catch {}
        try { this.proc?.kill(); } catch {}
    }

    private rejectAll(error: Error): void {
        for (const [, p] of this.pending) {
            clearTimeout(p.timer);
            p.reject(error);
        }
        this.pending.clear();
    }
}
