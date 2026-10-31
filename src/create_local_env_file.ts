import { EnconvoResponse } from "@enconvo/api";
import { createLocalEnvFile, type Options } from "./lib/ops";

/** 1Password: Mount .env — on-demand secret resolution inside processes; never read the mount into chat. */
export default async function main(request: Request) {
    const options = (await request.json().catch(() => ({}))) as Options;
    try {
        return EnconvoResponse.json(await createLocalEnvFile(options));
    } catch (e: any) {
        return EnconvoResponse.error([e.message, e.hint].filter(Boolean).join(" — "));
    }
}
