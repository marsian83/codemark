import {
	addressFlag,
	requireArgs,
	requireFlag,
	stringFlag,
} from "../lib/flags";
import { contextFromEnv } from "../lib/fromEnv";
import { report } from "../lib/report";
import { pull as pullOp } from "../ops/pull";
import type { Command } from "./index";

export const pull: Command = async (args, flags) => {
	const [publisher, key, label] = requireArgs(args, [
		"publisher",
		"key",
		"label",
	]) as [string, string, string];
	const ctx = await contextFromEnv(stringFlag(flags, "rpc"));
	const result = await pullOp(ctx, {
		publisher,
		key,
		label,
		forwardLabel: stringFlag(flags, "forward"),
		target: addressFlag(flags, "target"),
		reason: requireFlag(flags, "reason"),
	});
	await report("pull", result);
};
