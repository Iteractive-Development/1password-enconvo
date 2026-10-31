import { EnconvoResponse } from "@enconvo/api";
import { createEnvironment, type Options } from "./lib/ops";

/** 1Password: Create Environment — creates a named Environment in the account. */
export default async function main(request: Request) {
    const options = (await request.json().catch(() => ({}))) as Options;
    try {
        return EnconvoResponse.json(await createEnvironment(options));
    } catch (e: any) {
        return EnconvoResponse.error([e.message, e.hint].filter(Boolean).join(" — "));
    }
}
