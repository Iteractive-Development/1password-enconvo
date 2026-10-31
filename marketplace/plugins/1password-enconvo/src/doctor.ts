import { EnconvoResponse } from "@enconvo/api";
import { doctor, type Options } from "./lib/ops";

/** 1Password: Doctor — diagnoses the full setup chain; each check carries its exact fix. */
export default async function main(request: Request) {
    const options = (await request.json().catch(() => ({}))) as Options;
    try {
        return EnconvoResponse.json(await doctor(options));
    } catch (e: any) {
        return EnconvoResponse.error([e.message, e.hint].filter(Boolean).join(" — "));
    }
}
