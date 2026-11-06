import {
	addressFlag,
	requireArgs,
	requireFlag,
	stringFlag,
} from "../lib/flags";
import { contextFromEnv } from "../lib/fromEnv";
import { report } from "../lib/report";
import { publish as publishOp } from "../ops/publish";
import type { Command } from "./index";

export const publish: Command = async (args, flags) => {
	const [publisher, key] = requireArgs(args, ["publisher", "key"]) as [
		string,
		string,
	];
	const kind = stringFlag(flags, "kind") ?? "contract";
	if (kind !== "contract" && kind !== "delegate")
		throw new Error("--kind must be contract or delegate");
	const target = addressFlag(flags, "target");
	if (!target) throw new Error("--target is required");
	const ctx = await contextFromEnv(stringFlag(flags, "rpc"));
	const result = await publishOp(ctx, {
		publisher,
		key,
		kind,
		target,
		component: requireFlag(flags, "component"),
		version: requireFlag(flags, "version"),
		commit: stringFlag(flags, "commit"),
	});
	await report("publish", result);
};
