import type {
	PublisherVerdict,
	TargetResult,
	TargetRole,
} from "@codemark/shared/check";
import { decide, defaultThresholds } from "@codemark/shared/check/severity";
import { contractArtifact } from "@codemark/shared/names";
import type { Severity, Verdict } from "@codemark/shared/verdict";

const threeDays = 3 * 86_400;

const router: NonNullable<PublisherVerdict["release"]> = {
	name: "router-3-1-0.ci-1.acmeswap.eth",
	label: "router-3-1-0",
	kind: "contract",
	component: "router",
	version: "3.1.0",
	resolver: "0x8Df6bff4Ce76d167AcAc373a462CCAA38e11fF93",
	codeHash:
		"0xe7f98ee73dfe6d5c96cbf8936920f496b1b82f24326d6a415b4144a2252271de",
	ageSeconds: threeDays,
	proven: true,
};

function pinned(verdict: Verdict, reason?: string): PublisherVerdict {
	return {
		publisher: "acmeswap.eth",
		pinned: true,
		source: "pinned",
		key: "ci-1",
		verdict,
		reason,
		release: router,
	};
}

export type VerdictExample = {
	name: string;
	meaning: string;
	severity: Severity;
	headline: string;
	result: TargetResult;
};

const target = "0x8Df6bff4Ce76d167AcAc373a462CCAA38e11fF93";
const sepolia = 11155111;

function example(
	name: string,
	meaning: string,
	role: TargetRole,
	verdicts: PublisherVerdict[],
): VerdictExample {
	const decided = decide(role, verdicts, defaultThresholds);
	return {
		name,
		meaning,
		...decided,
		result: {
			target: { address: target, chainId: sepolia, role, via: "to" },
			artifact: contractArtifact(sepolia, target),
			verdicts,
			block: 0n,
			...decided,
		},
	};
}

export const verifiedLine = decide(
	"call",
	[pinned("VERIFIED")],
	defaultThresholds,
).headline;

export const revokedLine = decide(
	"call",
	[pinned("KEY REVOKED", "CI key leaked")],
	defaultThresholds,
).headline;

export const verdictExamples: VerdictExample[] = [
	example(
		"Verified",
		"A team you pinned released this, and the record can't be changed.",
		"call",
		[pinned("VERIFIED")],
	),
	example(
		"Key revoked",
		"The team cut off the key that released this.",
		"call",
		[pinned("KEY REVOKED", "CI key leaked")],
	),
	example("Pulled", "The team withdrew this release and said why.", "call", [
		pinned("PULLED", "reentrancy in router 3.0.2"),
	]),
	example(
		"Mismatch",
		"The code at this address doesn't match what the team released.",
		"call",
		[pinned("MISMATCH", "code hash differs")],
	),
	example(
		"Vouched for",
		"A team you haven't pinned claims this. That doesn't make it safe.",
		"delegation",
		[
			{
				...pinned("VERIFIED"),
				publisher: "acmeswap-app.eth",
				pinned: false,
				source: "index",
			},
		],
	),
	example("Unknown", "No team has released this contract.", "call", []),
];
