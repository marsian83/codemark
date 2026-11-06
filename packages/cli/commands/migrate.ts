import {
	addressFlag,
	ciGrantFlag,
	requireArgs,
	stringFlag,
} from "../lib/flags";
import { contextFromEnv } from "../lib/fromEnv";
import { toJson } from "../lib/json";
import { migrate as migrateOp } from "../ops/migrate";
import type { Command } from "./index";

export const migrate: Command = async (args, flags) => {
	const [publisher, oldKey, newKey] = requireArgs(args, [
		"publisher",
		"old-key",
		"new-key",
	]) as [string, string, string];
	const ctx = await contextFromEnv(stringFlag(flags, "rpc"));
	const sec = addressFlag(flags, "sec") ?? ctx.signers.sec?.account.address;
	if (!sec) throw new Error("--sec <address> or CODEMARK_SEC_KEY is required");
	const ci = ciGrantFlag(flags);
	const fromBlock = stringFlag(flags, "from-block");
	const result = await migrateOp(ctx, {
		publisher,
		oldKey,
		newKey,
		sec,
		ci,
		fromBlock: fromBlock ? BigInt(fromBlock) : undefined,
	});
	console.log(toJson(result));
	for (const s of result.skipped)
		console.error(`not migrated: ${s.label} (${s.reason})`);
};
