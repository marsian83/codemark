import { explain } from "@codemark/shared/check/explain";
import { defaultThresholds } from "@codemark/shared/check/severity";
import type {
	CheckResult,
	PublisherVerdict,
	Target,
	TargetResult,
} from "@codemark/shared/check/types";

export const actions = ["proceed", "ask_user", "refuse"] as const;
export type Action = (typeof actions)[number];

export type TargetDecision = {
	address: string;
	role: Target["role"];
	via: string;
	action: Action;
	title: string;
	detail: string;
};

export type Decision = {
	action: Action;
	reason: string;
	instruction: string;
	checkedAtBlock?: string;
	targets: TargetDecision[];
};

const instructions: Record<Action, string> = {
	proceed:
		"Every contract in this request was released by a publisher the user trusts. Amounts and recipients were not checked; apply your spending limits as usual.",
	ask_user:
		"Do not sign yet. Show the user the reason and wait for their decision.",
	refuse:
		"Do not sign, and do not retry with another address from the same source. Tell the user the reason.",
};

const plainName = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/;
const maxNameLength = 64;
const maxReasonLength = 200;

function forAgent(verdict: PublisherVerdict): PublisherVerdict {
	if (verdict.pinned)
		return { ...verdict, reason: verdict.reason?.slice(0, maxReasonLength) };
	const shown =
		verdict.publisher.length <= maxNameLength &&
		plainName.test(verdict.publisher);
	return {
		...verdict,
		reason: undefined,
		publisher: shown ? verdict.publisher : "a name with unusual characters",
	};
}

function targetAction(result: TargetResult): Action {
	if (
		result.error ||
		result.severity === "critical" ||
		result.verdicts.some((v) => v.checkFailed)
	)
		return "refuse";
	return result.severity === "info" ? "proceed" : "ask_user";
}

function describeTarget(
	result: TargetResult,
	checkedChainId: number,
): TargetDecision {
	const { address, role, via, chainId } = result.target;
	const { title, body } =
		chainId === checkedChainId
			? explain(
					{ ...result, verdicts: result.verdicts.map(forAgent) },
					defaultThresholds,
				)
			: {
					title: `Chain ${chainId} isn't checked`,
					body: "Codemark only checks Sepolia today, so nothing is known about who released this contract.",
				};
	return {
		address,
		role,
		via,
		action: targetAction(result),
		title,
		detail: body,
	};
}

function result(
	action: Action,
	reason: string,
	targets: TargetDecision[] = [],
	checkedAtBlock?: string,
): Decision {
	return {
		action,
		reason,
		instruction: instructions[action],
		checkedAtBlock,
		targets,
	};
}

export function decisionFromCheck(
	check: CheckResult,
	checkedChainId: number,
): Decision {
	const targets = check.results.map((r) => describeTarget(r, checkedChainId));
	const block = check.block.toString();
	const worst = [...actions]
		.reverse()
		.map((action) => targets.find((t) => t.action === action))
		.find(Boolean);
	if (!worst) return nothingToCheck();
	return result(
		worst.action,
		`${worst.title}. ${worst.detail}`.trim(),
		targets,
		block,
	);
}

export function nothingToCheck(): Decision {
	return result(
		"ask_user",
		"Nothing here names a contract Codemark can check, so it says nothing about who is on the other side.",
	);
}

export function checkFailed(error: unknown): Decision {
	const message = error instanceof Error ? error.message.split("\n")[0] : "";
	return result(
		"refuse",
		`Couldn't finish the check, so treat this as unsafe. ${message ?? ""}`.trim(),
	);
}
