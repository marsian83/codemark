import type { PublisherVerdict, TargetRole } from "@codemark/shared/check";
import {
	type Step,
	type StepState,
	trustPath,
} from "@codemark/shared/check/explain";
import type { Thresholds } from "@codemark/shared/check/severity";
import { Icon, type IconName } from "../ui/Icon";
import { cn } from "../utils/cn";
import { NameSegments, PublisherLink } from "./Links";

const node: Record<
	StepState,
	{ icon: IconName; className: string; label: string }
> = {
	ok: {
		icon: "check",
		className: "bg-success/12 text-success",
		label: "Passed",
	},
	caution: {
		icon: "minus",
		className: "bg-caution/15 text-caution",
		label: "Needs care",
	},
	fail: {
		icon: "close",
		className: "bg-error text-typography-invert",
		label: "Failed",
	},
	open: {
		icon: "circle-dashed",
		className: "text-typography-tertiary",
		label: "Not checked",
	},
};

function StepValue({ step, publisher }: { step: Step; publisher: string }) {
	if (!step.value) return null;
	if (step.id === "publisher") return <PublisherLink name={step.value} />;
	if (step.id === "release")
		return <NameSegments name={step.value} publisher={publisher} />;
	if (step.id === "key")
		return (
			<span className="tabular text-typography-primary">{step.value}</span>
		);
	return <span className="text-typography-primary">{step.value}</span>;
}

export function TrustPath({
	verdict,
	role,
	thresholds,
}: {
	verdict: PublisherVerdict;
	role: TargetRole;
	thresholds: Thresholds;
}) {
	const steps = trustPath(verdict, role, thresholds);
	return (
		<ol className="flex flex-col" aria-label="Trust path">
			{steps.map((step, i) => {
				const look = node[step.state];
				const failed = step.state === "fail";
				return (
					<li key={step.id} className="relative flex gap-3 pb-3 last:pb-0">
						{i < steps.length - 1 ? (
							<span
								aria-hidden
								className="absolute top-8 bottom-0 left-3.5 border-l border-border-primary"
							/>
						) : null}
						<span
							className={cn(
								"flex-center mt-1 size-7 shrink-0 rounded-full",
								look.className,
							)}
						>
							<Icon name={look.icon} className="size-4" />
						</span>
						<div className={cn("flex min-w-0 flex-1 flex-col gap-0.5 pt-1.5")}>
							<div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm">
								<span
									className={cn(
										"font-medium",
										step.state === "open"
											? "text-typography-tertiary"
											: "text-typography-secondary",
									)}
								>
									{step.label}
									<span className="sr-only">: {look.label}</span>
								</span>
								<StepValue step={step} publisher={verdict.publisher} />
							</div>
							{step.note ? (
								<p
									className={cn(
										"text-sm",
										failed
											? "text-error"
											: step.state === "open"
												? "text-typography-tertiary"
												: "text-typography-secondary",
									)}
								>
									{step.note}
								</p>
							) : null}
						</div>
					</li>
				);
			})}
		</ol>
	);
}
