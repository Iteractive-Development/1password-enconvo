import { listEnvironments, type Options } from "../lib/ops";

interface Params {
    /** Optional 1Password account ID override. */
    account_id?: string;
}

/** List all 1Password Environments with IDs and names. Read-only; never returns secret values. Route: 1password-enconvo/list_environments
 * @param {Request} request - Request object, body is {@link Params}
 */
export default async function main(request: Request) {
    const params = (await request.json().catch(() => ({}))) as Options;
    try {
        return Response.json(await listEnvironments(params));
    } catch (e: any) {
        return Response.json({ error: e.message, hint: e.hint }, { status: 400 });
    }
}
