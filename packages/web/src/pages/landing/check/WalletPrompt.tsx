import {
	explain,
	roleLabel,
	type Step,
	type StepState,
	severityLabel,
	trustPath,
} from "@codemark/shared/check/explain";
import { defaultThresholds } from "@codemark/shared/check/severity";
import type { Severity } from "@codemark/shared/verdict";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "../../../utils/cn";
import type { VerdictExample } from "../verdicts";

const bannerTone: Record<Severity, string> = {
	info: "bg-[#cdeee2] text-[#0b4f3d]",
	amber: "bg-[#fde3c4] text-[#7a3a04]",
	warning: "bg-[#fde3c4] text-[#7a3a04]",
	critical: "bg-[#ffd8cf] text-[#8f1c09]",
};

const stepTone: Record<StepState, string> = {
	ok: "bg-[#0f7a5f] text-sand",
	caution: "bg-[#b86305] text-sand",
	fail: "bg-[#c72f16] text-sand",
	open: "bg-night/15 text-night/60",
};

const stepPath: Record<StepState, string> = {
	ok: "M3 6.5 5.2 8.7 9 3.8",
	caution: "M3 6h6",
	fail: "M3.5 3.5l5 5m0-5l-5 5",
	open: "",
};

function StepMark({ state }: { state: StepState }) {
	return (
		<span
			className={cn(
				"grid size-5 shrink-0 place-items-center rounded-full",
				stepTone[state],
			)}
		>
			<svg viewBox="0 0 12 12" aria-hidden className="size-3">
				<path
					d={stepPath[state]}
					fill="none"
					stroke="currentColor"
					strokeWidth="1.8"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
			</svg>
		</span>
	);
}

function StepRow({ step, index }: { step: Step; index: number }) {
	const reduced = useReducedMotion();
	return (
		<motion.li
			initial={reduced ? false : { opacity: 0, x: -8 }}
			animate={{ opacity: 1, x: 0 }}
			transition={{ delay: 0.18 + index * 0.16, duration: 0.2 }}
			className="flex items-start gap-2.5 py-1.5"
		>
			<StepMark state={step.state} />
			<p
				className={cn(
					"min-w-0 text-sm leading-5 font-medium break-words",
					step.state === "open" && "text-night/60",
				)}
			>
				{step.label}
				{step.value ? (
					<span className="font-normal text-night/75"> {step.value}</span>
				) : null}
			</p>
		</motion.li>
	);
}

export function WalletPrompt({ example }: { example: VerdictExample }) {
	const reduced = useReducedMotion();
	const { result, severity } = example;
	const { title, body } = explain(result, defaultThresholds);
	const claim = result.verdicts[0];
	const steps = claim
		? trustPath(claim, result.target.role, defaultThresholds)
		: [];

	return (
		<div className="cartouche flex w-full max-w-[26rem] flex-col bg-sand p-5 text-night [--chamfer:1rem]">
			<div className="flex items-center justify-between gap-4">
				<p className="text-base font-semibold">Confirm transaction</p>
				<p className="text-sm text-night/70">Sepolia</p>
			</div>
			<dl className="mt-3 flex items-center justify-between gap-4 border-y border-night/15 py-2 text-sm">
				<dt>{roleLabel[result.target.role]}</dt>
				<dd className="font-label text-xs">0x8Df6…fF93</dd>
			</dl>
			<p className="mt-3 text-xs font-medium text-night/70">
				Insight from Codemark
			</p>
			<motion.div
				key={example.name}
				initial={reduced ? false : { opacity: 0, y: 6 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.18 }}
				className={cn(
					"cartouche mt-1.5 p-3 [--chamfer:0.5rem]",
					bannerTone[severity],
				)}
			>
				<p className="text-xs font-semibold">{severityLabel[severity]}</p>
				<p className="mt-0.5 text-base leading-5 font-semibold">{title}</p>
				{body ? <p className="mt-1 text-sm leading-5">{body}</p> : null}
			</motion.div>
			<ul key={`${example.name}-steps`} className="mt-2 min-h-[11.75rem]">
				{steps.map((step, index) => (
					<StepRow key={step.id} step={step} index={index} />
				))}
			</ul>
			<div className="mt-2 grid grid-cols-2 gap-2" aria-hidden>
				<span className="cartouche grid h-10 place-items-center bg-night/10 text-sm font-medium [--chamfer:0.375rem]">
					Reject
				</span>
				<span className="cartouche grid h-10 place-items-center bg-night text-sm font-medium text-sand [--chamfer:0.375rem]">
					{severity === "critical" ? "Confirm twice" : "Confirm"}
				</span>
			</div>
		</div>
	);
}
