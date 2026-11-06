import type { PublisherVerdict, TargetResult } from "@codemark/shared/check";

const address = "0x7a250d5630b4cf539739df2c5dacb4c659f2488d";
const resolver = "0x1111111111111111111111111111111111111111";

function result(
	partial: Partial<TargetResult> &
		Pick<TargetResult, "severity" | "headline" | "verdicts">,
): TargetResult {
	return {
		target: { address, chainId: 11155111, role: "call", via: "tx.to" },
		artifact: `eip155:11155111:${address}`,
		block: 7_412_908n,
		...partial,
	};
}

function verdict(v: Partial<PublisherVerdict>): PublisherVerdict {
	return {
		publisher: "pwnmeswap.eth",
		pinned: true,
		key: "ci-1",
		verdict: "VERIFIED",
		source: "pinned",
		release: {
			name: "router-3-1-0.ci-1.pwnmeswap.eth",
			label: "router-3-1-0",
			kind: "contract",
			component: "router",
			version: "3.1.0",
			resolver,
			codeHash: `0x${"ab".repeat(32)}`,
			ageSeconds: 3 * 86400,
			proven: true,
		},
		...v,
	};
}

export const sampleResults: { title: string; result: TargetResult }[] = [
	{
		title: "VERIFIED, pinned",
		result: result({
			severity: "info",
			headline: "Published by pwnmeswap.eth · router 3.1.0",
			verdicts: [verdict({})],
		}),
	},
	{
		title: "VERIFIED, pinned, under 1 h",
		result: result({
			severity: "amber",
			headline: "Published by pwnmeswap.eth 40 s ago",
			verdicts: [
				verdict({
					release: {
						...(verdict({}).release as NonNullable<
							ReturnType<typeof verdict>["release"]
						>),
						name: "router-3-2-0.ci-1.pwnmeswap.eth",
						version: "3.2.0",
						ageSeconds: 40,
					},
				}),
			],
		}),
	},
	{
		title: "VERIFIED-unproven",
		result: result({
			severity: "warning",
			headline: "Published by pwnmeswap.eth; resolver could change",
			verdicts: [
				verdict({
					verdict: "VERIFIED-unproven",
					reason:
						"The resolver is a verified proxy but its records are not proven immutable.",
				}),
			],
		}),
	},
	{
		title: "KEY REVOKED",
		result: result({
			severity: "critical",
			headline: "KEY REVOKED by pwnmeswap.eth: CI key leaked",
			verdicts: [
				verdict({
					verdict: "KEY REVOKED",
					reason:
						"ci-1 is no longer mounted under pwnmeswap.eth. CI key leaked.",
				}),
			],
		}),
	},
	{
		title: "PULLED with reason",
		result: result({
			severity: "critical",
			headline: "Pulled by pwnmeswap.eth: reentrancy in router 3.0.2",
			verdicts: [
				verdict({
					verdict: "PULLED",
					reason:
						"Unregistered by pwnmeswap.eth. Reason: reentrancy in router 3.0.2.",
				}),
			],
		}),
	},
	{
		title: "MISMATCH",
		result: result({
			severity: "critical",
			headline: "Record does not match this contract",
			verdicts: [
				verdict({
					verdict: "MISMATCH",
					reason:
						"The record names code hash 0xab…ab but the deployed code hash differs.",
				}),
			],
		}),
	},
	{
		title: "UNKNOWN",
		result: result({
			severity: "warning",
			headline: "No publisher has released this address",
			verdicts: [],
			target: {
				address: "0xe71100000000000000000000000000000000dead",
				chainId: 11155111,
				role: "approval-spender",
				via: "approve(spender)",
			} as TargetResult["target"],
		}),
	},
	{
		title: "Unpinned publisher, 7702 delegation",
		result: result({
			target: {
				address,
				chainId: 11155111,
				role: "delegation",
				via: "authorization",
			},
			severity: "critical",
			headline: "Vouched for by pwnmeswap-app.eth, which you have not pinned",
			verdicts: [
				verdict({
					publisher: "pwnmeswap-app.eth",
					pinned: false,
					source: "index",
					key: "ci-1",
				}),
			],
		}),
	},
	{
		title: "Two publishers disagree",
		result: result({
			severity: "critical",
			headline: "pwnmeswap.eth revoked this; pwnmeswap-app.eth vouches for it",
			verdicts: [
				verdict({ verdict: "KEY REVOKED", reason: "CI key leaked." }),
				verdict({
					publisher: "pwnmeswap-app.eth",
					pinned: false,
					source: "index",
				}),
			],
		}),
	},
	{
		title: "Index unavailable",
		result: result({
			severity: "warning",
			headline: "No pinned publisher released this address",
			verdicts: [],
			indexUnavailable: true,
		}),
	},
	{
		title: "Index incomplete",
		result: result({
			severity: "warning",
			headline: "Published by pwnmeswap.eth",
			verdicts: [verdict({})],
			indexIncomplete: true,
		}),
	},
	{
		title: "Check error",
		result: result({
			severity: "warning",
			headline: "Could not be checked",
			verdicts: [],
			error: "block not found",
		}),
	},
];
