import { EnconvoResponse } from "@enconvo/api";
import { appendVariables, type Options } from "./lib/ops";

/** 1Password: Add Variables — values flow into the vault only, never back. */
export default async function main(request: Request) {
    const options = (await request.json().catch(() => ({}))) as Options;
    try {
        return EnconvoResponse.json(await appendVariables(options));
    } catch (e: any) {
        return EnconvoResponse.error([e.message, e.hint].filter(Boolean).join(" — "));
    }
}
