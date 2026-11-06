import { type PendingRow, reviveRow, writeRow } from "../lib/arkivRow";
import { requireArgs, stringFlag } from "../lib/flags";
import { contextFromEnv } from "../lib/fromEnv";
import { toJson } from "../lib/json";
import type { Command } from "./index";

export const arkivRetry: Command = async (args, flags) => {
	const [file] = requireArgs(args, ["saved result json"]) as [string];
	const saved = await Bun.file(file).json();
	const pending = saved?.arkiv as (PendingRow & { status: string }) | undefined;
	if (pending?.status !== "failed" || !pending.row)
		throw new Error(`${file} has no failed Arkiv row to retry`);
	const ctx = await contextFromEnv(stringFlag(flags, "rpc"));
	const outcome = await writeRow(ctx, reviveRow(pending));
	console.log(toJson(outcome));
	if (outcome.status !== "written") {
		console.error(`row not written; ${file} still holds it`);
		process.exitCode = 3;
		return;
	}
	saved.arkiv = outcome;
	await Bun.write(file, `${toJson(saved)}\n`);
};
