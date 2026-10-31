import { renameEnvironment, type Options } from "../lib/ops";

interface Params {
    /** Environment name or ID. @required */
    environment: string;
    /** The new name. @required */
    newName: string;
    /** Optional 1Password account ID override. */
    account_id?: string;
}

/** Rename a 1Password Environment. Route: 1password-enconvo/rename_environment
 * @param {Request} request - Request object, body is {@link Params}
 */
export default async function main(request: Request) {
    const params = (await request.json().catch(() => ({}))) as Options;
    try {
        return Response.json(await renameEnvironment(params));
    } catch (e: any) {
        return Response.json({ error: e.message, hint: e.hint }, { status: 400 });
    }
}
