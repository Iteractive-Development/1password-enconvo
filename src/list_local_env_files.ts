import { EnconvoResponse } from "@enconvo/api";
import { listLocalEnvFiles, type Options } from "./lib/ops";

/** 1Password: List Mounts — mounted .env paths for an Environment. */
export default async function main(request: Request) {
    const options = (await request.json().catch(() => ({}))) as Options;
    try {
        return EnconvoResponse.json(await listLocalEnvFiles(options));
    } catch (e: any) {
        return EnconvoResponse.error([e.message, e.hint].filter(Boolean).join(" — "));
    }
}
