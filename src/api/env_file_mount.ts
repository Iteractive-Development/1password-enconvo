import { createLocalEnvFile, type Options } from "../lib/ops";

interface Params {
    /** Environment name or ID. @required */
    environment: string;
    /** Absolute path where the .env file should be mounted. @required */
    mountPath: string;
    /** Optional 1Password account ID override. */
    account_id?: string;
}

/** Create a locally mounted .env file for an Environment; secrets resolve on demand inside processes. Route: 1password-enconvo/create_local_env_file
 * @param {Request} request - Request object, body is {@link Params}
 */
export default async function main(request: Request) {
    const params = (await request.json().catch(() => ({}))) as Options;
    try {
        return Response.json(await createLocalEnvFile(params));
    } catch (e: any) {
        return Response.json({ error: e.message, hint: e.hint }, { status: 400 });
    }
}
