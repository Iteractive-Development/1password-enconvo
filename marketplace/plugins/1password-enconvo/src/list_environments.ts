import { EnconvoResponse } from "@enconvo/api";
import { listEnvironments, type Options } from "./lib/ops";

/** 1Password: List Environments — read-only, never returns secret values. */
export default async function main(request: Request) {
    const options = (await request.json().catch(() => ({}))) as Options;
    try {
        return EnconvoResponse.json(await listEnvironments(options));
    } catch (e: any) {
        return EnconvoResponse.error([e.message, e.hint].filter(Boolean).join(" — "));
    }
}
