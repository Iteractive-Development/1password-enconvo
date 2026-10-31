import { listVariables, type Options } from "../lib/ops";

interface Params {
    /** Environment name or ID. @required */
    environment: string;
    /** Optional 1Password account ID override. */
    account_id?: string;
}

/** List the variable NAMES in a 1Password Environment. Never returns values. Route: 1password-enconvo/list_variables
 * @param {Request} request - Request object, body is {@link Params}
 */
export default async function main(request: Request) {
    const params = (await request.json().catch(() => ({}))) as Options;
    try {
        return Response.json(await listVariables(params));
    } catch (e: any) {
        return Response.json({ error: e.message, hint: e.hint }, { status: 400 });
    }
}
