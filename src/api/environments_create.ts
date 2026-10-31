import { createEnvironment, type Options } from "../lib/ops";

interface Params {
    /** Name for the new Environment. @required */
    environmentName: string;
    /** Optional 1Password account ID override. */
    account_id?: string;
}

/** Create a new 1Password Environment by name. Route: 1password-enconvo/create_environment
 * @param {Request} request - Request object, body is {@link Params}
 */
export default async function main(request: Request) {
    const params = (await request.json().catch(() => ({}))) as Options;
    try {
        return Response.json(await createEnvironment(params));
    } catch (e: any) {
        return Response.json({ error: e.message, hint: e.hint }, { status: 400 });
    }
}
