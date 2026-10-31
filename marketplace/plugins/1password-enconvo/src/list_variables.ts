import { EnconvoResponse } from "@enconvo/api";
import { listVariables, type Options } from "./lib/ops";

/** 1Password: List Variable Names — names only, never values. */
export default async function main(request: Request) {
    const options = (await request.json().catch(() => ({}))) as Options;
    try {
        return EnconvoResponse.json(await listVariables(options));
    } catch (e: any) {
        return EnconvoResponse.error([e.message, e.hint].filter(Boolean).join(" — "));
    }
}
