import { createArkivReader } from "@codemark/shared/arkiv/client";
import { createArkivSource } from "@codemark/shared/arkiv/source";
import {
	type CheckResult,
	checkTargets,
	type Pin,
	type Target,
} from "@codemark/shared/check";
import { createEnsClient } from "@codemark/shared/ens/client";
import { config } from "./config";

export type CheckSource = "sepolia" | "fork";

export function ensFor(source: CheckSource) {
	return createEnsClient(
		source === "fork" ? config.anvilRpc : config.sepoliaRpc,
	);
}

export async function runCheck(
	source: CheckSource,
	targets: Target[],
	pins: Pin[],
): Promise<{ result: CheckResult; now: number }> {
	const ens = ensFor(source);
	const head = await ens.publicClient.getBlock({ blockTag: "latest" });
	const now =
		source === "fork" ? Number(head.timestamp) : Math.floor(Date.now() / 1000);
	const arkiv = createArkivSource(createArkivReader(config.arkivAccessKey));
	const result = await checkTargets(
		{ targets, pins },
		{
			ens,
			arkiv,
			headLag: source === "fork" ? 0n : undefined,
			now,
			delegateMinAgeSeconds: config.delegateMinAgeSeconds,
			freshCallAgeSeconds: config.freshCallAgeSeconds,
		},
	);
	return { result, now };
}
