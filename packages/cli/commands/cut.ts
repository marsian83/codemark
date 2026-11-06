import { requireArgs, requireFlag, stringFlag } from "../lib/flags";
import { contextFromEnv } from "../lib/fromEnv";
import { report } from "../lib/report";
import { cut as cutOp } from "../ops/cut";
import type { Command } from "./index";

export const cut: Command = async (args, flags) => {
	const [publisher, key] = requireArgs(args, ["publisher", "key"]) as [
		string,
		string,
	];
	const linkBlock = stringFlag(flags, "link-block");
	const ctx = await contextFromEnv(stringFlag(flags, "rpc"));
	const result = await cutOp(ctx, {
		publisher,
		key,
		reason: requireFlag(flags, "reason"),
		linkBlock: linkBlock ? BigInt(linkBlock) : undefined,
	});
	await report("cut", result);
};
