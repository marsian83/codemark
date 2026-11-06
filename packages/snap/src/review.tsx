import { createArkivReader } from "@codemark/shared/arkiv/client";
import { createArkivSource } from "@codemark/shared/arkiv/source";
import { checkTargets } from "@codemark/shared/check";
import type { Target, TargetResult } from "@codemark/shared/check/types";
import { type OnSignatureResponse, SeverityLevel } from "@metamask/snaps-sdk";
import { verifyPins } from "./pins";
import { Failure, Report } from "./render";
import { createSnapEnsClient } from "./rpc";
import { createCache, loadState } from "./state";

const delegateMinAgeSeconds = 86400;
const freshCallAgeSeconds = 3600;

export async function review(
	targets: Target[],
): Promise<OnSignatureResponse | null> {
	if (targets.length === 0) return null;
	try {
		const ens = createSnapEnsClient();
		const state = await loadState();
		const [pinChecks, result] = await Promise.all([
			verifyPins(ens, state),
			checkTargets(
				{
					targets,
					pins: state.pins.map(({ name, pubRegistry }) => ({
						name,
						pubRegistry,
					})),
				},
				{
					ens,
					arkiv: createArkivSource(createArkivReader()),
					cache: createCache(state),
					now: Math.floor(Date.now() / 1000),
					delegateMinAgeSeconds,
					freshCallAgeSeconds,
				},
			),
		]);
		const changedPins = pinChecks.filter((p) => p.status === "changed");
		const unverified = pinChecks.filter((p) => p.status === "unknown");
		const critical = result.severity === "critical" || changedPins.length > 0;
		const results: TargetResult[] = result.results;
		const content = (
			<Report
				results={results}
				changedPins={changedPins}
				unverified={unverified}
			/>
		);
		return critical
			? { content, severity: SeverityLevel.Critical }
			: { content };
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		const content = <Failure message={message} />;
		const dangerous = targets.some(
			(t) => t.role === "delegation" || t.role === "delegatecall",
		);
		return dangerous
			? { content, severity: SeverityLevel.Critical }
			: { content };
	}
}
