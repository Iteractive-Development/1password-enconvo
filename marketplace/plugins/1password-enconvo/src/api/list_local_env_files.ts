import { listLocalEnvFiles, type Options } from "../lib/ops";

interface Params {
    /** Environment name or ID. @required */
    environment: string;
    /** Optional 1Password account ID override. */
    account_id?: string;
}

/** List locally mounted .env files for an Environment; returns paths only. Route: 1password-enconvo/list_local_env_files
 * @param {Request} request - Request object, body is {@link Params}
 */
export default async function main(request: Request) {
    const params = (await request.json().catch(() => ({}))) as Options;
    try {
        return Response.json(await listLocalEnvFiles(params));
    } catch (e: any) {
        return Response.json({ error: e.message, hint: e.hint }, { status: 400 });
    }
}
