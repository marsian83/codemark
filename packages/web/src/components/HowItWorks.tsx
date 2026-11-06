import { formatDuration } from "@codemark/shared/check/explain";
import { config } from "../lib/config";
import { Card } from "../ui/Card";
import { NameSegments } from "./Links";

const steps = [
	{
		label: "Publisher",
		value: <span className="font-mono font-medium">acmeswap.eth</span>,
		text: "The team's ENS name. Pin the publishers you trust. Only they can mark a contract as verified.",
	},
	{
		label: "Release key",
		value: <span className="font-mono">ci-1</span>,
		text: "Each signing key is its own name under the publisher, so the team can revoke one in a single transaction.",
	},
	{
		label: "Release",
		value: (
			<NameSegments
				name="router-3-1-0.ci-1.acmeswap.eth"
				publisher="acmeswap.eth"
			/>
		),
		text: "Every release is a name under its key that records the contract address and its code hash.",
	},
	{
		label: "Record",
		text: "The record can't be edited after release, so a stolen release key can't rewrite it.",
	},
	{
		label: "Age",
		text: `Account upgrades need a release at least ${formatDuration(config.thresholds.delegateMinAgeSeconds)} old, which gives the team time to pull a bad one.`,
	},
];

export default function HowItWorks() {
	return (
		<Card className="flex flex-col gap-5 px-5 py-5 sm:px-6 sm:py-6">
			<div className="flex flex-col gap-1">
				<h2 className="font-medium">What a check proves</h2>
				<p className="text-sm text-typography-secondary">
					A result walks this path through ENS. The first step that fails is
					where it turns red.
				</p>
			</div>
			<ol className="flex flex-col">
				{steps.map((step, i) => (
					<li key={step.label} className="relative flex gap-3 pb-4 last:pb-0">
						{i < steps.length - 1 ? (
							<span
								aria-hidden
								className="absolute top-7 bottom-1 left-3 border-l border-border-primary"
							/>
						) : null}
						<span className="flex-center tabular size-6 shrink-0 rounded-full border border-border-primary font-mono text-xs text-typography-tertiary">
							{i + 1}
						</span>
						<div className="flex min-w-0 flex-col gap-0.5 pt-0.5">
							<div className="flex flex-wrap items-baseline gap-x-2">
								<span className="text-xs text-typography-tertiary">
									{step.label}
								</span>
								{step.value ? (
									<span className="text-sm">{step.value}</span>
								) : null}
							</div>
							<p className="text-sm text-typography-secondary">{step.text}</p>
						</div>
					</li>
				))}
			</ol>
			<p className="border-t border-border-secondary pt-4 text-xs text-typography-tertiary">
				The search index only suggests where to look. Every answer is checked
				again on ENS, so a fake index entry changes nothing.
			</p>
		</Card>
	);
}
