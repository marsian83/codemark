import { createArkivReader } from "@codemark/shared/arkiv/client";
import { createArkivSource } from "@codemark/shared/arkiv/source";
import { checkTargets } from "@codemark/shared/check";
import { defaultThresholds } from "@codemark/shared/check/severity";
import type { Pin, TargetRole } from "@codemark/shared/check/types";
import { parsePublisherName } from "@codemark/shared/ens/publisher";
import { env } from "../env";
import { addressFlag, requireArgs, stringFlag } from "../lib/flags";
import { contextFromEnv } from "../lib/fromEnv";
import { toJson } from "../lib/json";
import { registryOf } from "../ops/registries";
import type { Command } from "./index";

const roles: TargetRole[] = [
	"call",
	"delegatecall",
	"delegation",
	"approval-spender",
	"permit-spender",
];

export const verify: Command = async (args, flags) => {
	requireArgs(args, ["address"]);
	const address = addressFlag({ address: args[0] }, "address");
	if (!address) throw new Error("usage: verify <address>");
	const role = (stringFlag(flags, "role") ?? "call") as TargetRole;
	if (!roles.includes(role))
		throw new Error(`--role must be one of ${roles.join(", ")}`);
	const ctx = await contextFromEnv(stringFlag(flags, "rpc"));
	const pins: Pin[] = [];
	for (const name of (stringFlag(flags, "pin") ?? "").split(",")) {
		if (!name) continue;
		const pinned = parsePublisherName(name);
		pins.push({ name: pinned, pubRegistry: await registryOf(ctx, pinned) });
	}
	const block = stringFlag(flags, "block");
	const result = await checkTargets(
		{
			targets: [
				{ address, chainId: ctx.ens.deployment.chainId, role, via: "cli" },
			],
			pins,
		},
		{
			ens: ctx.ens,
			arkiv: flags["no-index"]
				? undefined
				: createArkivSource(createArkivReader(env.ARKIV_ACCESS_KEY)),
			block: block ? BigInt(block) : undefined,
			now: Math.floor(Date.now() / 1000),
			delegateMinAgeSeconds: Number(
				stringFlag(flags, "min-age") ?? defaultThresholds.delegateMinAgeSeconds,
			),
			freshCallAgeSeconds: defaultThresholds.freshCallAgeSeconds,
		},
	);
	if (flags.json) {
		console.log(toJson(result));
	} else {
		for (const r of result.results) {
			console.log(`${r.target.address} (${r.target.role}) at block ${r.block}`);
			console.log(`  ${r.severity.toUpperCase()}: ${r.headline}`);
			for (const v of r.verdicts)
				console.log(
					`  ${v.verdict.padEnd(17)} ${v.publisher}${v.pinned ? " (pinned)" : ""}${v.release ? `  ${v.release.name}` : ""}${v.reason ? `  ${v.reason}` : ""}`,
				);
			if (r.error) console.log(`  error: ${r.error}`);
		}
	}
	if (result.severity === "critical") process.exitCode = 2;
	else if (result.severity === "warning") process.exitCode = 1;
};
