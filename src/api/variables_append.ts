import { appendVariables, type Options } from "../lib/ops";

interface VariableInput {
    /** Variable name, e.g. ACME_API_KEY. @required */
    name: string;
    /** Variable value — stored into the vault, write-only. @required */
    value: string;
    /** Conceal the value when displayed (default true). */
    concealed?: boolean;
}

interface Params {
    /** Environment name or ID. @required */
    environment: string;
    /** Variables to add or update. @required */
    variables: VariableInput[];
    /** Optional 1Password account ID override. */
    account_id?: string;
}

/** Add or update variables in a 1Password Environment. Values flow into the vault only and are never returned. Route: 1password-enconvo/append_variables
 * @param {Request} request - Request object, body is {@link Params}
 */
export default async function main(request: Request) {
    const params = (await request.json().catch(() => ({}))) as Options;
    try {
        return Response.json(await appendVariables(params));
    } catch (e: any) {
        return Response.json({ error: e.message, hint: e.hint }, { status: 400 });
    }
}
