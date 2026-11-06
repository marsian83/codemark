import {
	addressFlag,
	ciGrantFlag,
	requireArgs,
	stringFlag,
} from "../lib/flags";
import { contextFromEnv } from "../lib/fromEnv";
import { toJson } from "../lib/json";
import { addKey as addKeyOp } from "../ops/addKey";
import type { Command } from "./index";

export const addKey: Command = async (args, flags) => {
	const [publisher, key] = requireArgs(args, ["publisher", "key"]) as [
		string,
		string,
	];
	const ctx = await contextFromEnv(stringFlag(flags, "rpc"));
	const sec = addressFlag(flags, "sec") ?? ctx.signers.sec?.account.address;
	if (!sec) throw new Error("--sec <address> or CODEMARK_SEC_KEY is required");
	const ci = ciGrantFlag(flags);
	const days = BigInt(stringFlag(flags, "ttl-days") ?? "90");
	const result = await addKeyOp(ctx, {
		publisher,
		key,
		sec,
		ci,
		ttlSeconds: days * 24n * 3600n,
		replaces: stringFlag(flags, "replaces"),
	});
	console.log(toJson(result));
};
