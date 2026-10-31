import { doctor, type Options } from "../lib/ops";

interface Params {
    /** Optional 1Password account ID override. */
    account_id?: string;
    /** Optional 1password-mcp binary path override. */
    binary_path?: string;
}

/** Diagnose the 1Password Environments setup: binary, handshake, tool surface, authentication, Environments reachability — each check with its exact fix. Route: 1password-enconvo/doctor
 * @param {Request} request - Request object, body is {@link Params}
 */
export default async function main(request: Request) {
    const params = (await request.json().catch(() => ({}))) as Options;
    try {
        return Response.json(await doctor(params));
    } catch (e: any) {
        return Response.json({ error: e.message, hint: e.hint }, { status: 400 });
    }
}
