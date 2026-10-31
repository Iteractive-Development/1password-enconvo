import { EnconvoResponse } from "@enconvo/api";
import { renameEnvironment, type Options } from "./lib/ops";

/** 1Password: Rename Environment — renames an Environment by name or ID. */
export default async function main(request: Request) {
    const options = (await request.json().catch(() => ({}))) as Options;
    try {
        return EnconvoResponse.json(await renameEnvironment(options));
    } catch (e: any) {
        return EnconvoResponse.error([e.message, e.hint].filter(Boolean).join(" — "));
    }
}
