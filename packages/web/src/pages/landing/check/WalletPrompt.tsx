import {
	explain,
	roleLabel,
	type Step,
	type StepState,
	trustPath,
} from "@codemark/shared/check/explain";
import { defaultThresholds } from "@codemark/shared/check/severity";
import type { Severity } from "@codemark/shared/verdict";
import { motion, useReducedMotion } from "motion/react";
import { shortAddress } from "../../../lib/format";
import { cn } from "../../../utils/cn";
import type { VerdictExample } from "../verdicts";
import { MetaMaskFox } from "./MetaMaskFox";

const bannerTone: Record<Severity, { box: string; bar: string; text: string }> =
	{
		info: {
			box: "bg-[#457a391a]",
			bar: "bg-[#457a39]",
			text: "text-[#2f5a26]",
		},
		amber: {
			box: "bg-[#9a63001a]",
			bar: "bg-[#9a6300]",
			text: "text-[#6f4700]",
		},
		warning: {
			box: "bg-[#9a63001a]",
			bar: "bg-[#9a6300]",
			text: "text-[#6f4700]",
		},
		critical: {
			box: "bg-[#ca35421a]",
			bar: "bg-[#ca3542]",
			text: "text-[#a11f2c]",
		},
	};

const stepTone: Record<StepState, string> = {
	ok: "text-[#457a39]",
	caution: "text-[#9a6300]",
	fail: "text-[#ca3542]",
	open: "text-[#686e7d]",
};

const stepPath: Record<StepState, string> = {
	ok: "M3 8.5 6.4 12 13 4.5",
	caution: "M3.5 8h9",
	fail: "M4 4l8 8m0-8l-8 8",
	open: "",
};

function StepRow({ step, index }: { step: Step; index: number }) {
	const reduced = useReducedMotion();
	return (
		<motion.li
			initial={reduced ? false : { opacity: 0, y: 4 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: 0.15 + index * 0.13, duration: 0.18 }}
			className="flex h-6 items-center gap-2 text-[0.8125rem]"
		>
			<svg
				viewBox="0 0 16 16"
				aria-hidden
				className={cn("size-4 shrink-0", stepTone[step.state])}
			>
				{step.state === "open" ? (
					<circle cx="8" cy="8" r="3.5" fill="currentColor" />
				) : (
					<path
						d={stepPath[step.state]}
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				)}
			</svg>
			<span
				className={cn(
					"font-medium whitespace-nowrap",
					step.state === "open" && "text-[#686e7d]",
				)}
			>
				{step.label}
			</span>
			{step.value ? (
				<span className="min-w-0 truncate text-[#686e7d]">{step.value}</span>
			) : null}
		</motion.li>
	);
}

export function InfoRow({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className="flex items-center justify-between gap-4 px-3 py-2 text-[0.8125rem]">
			<span className="text-[#686e7d]">{label}</span>
			<span className="min-w-0 truncate font-medium">{children}</span>
		</div>
	);
}

export function InsightBanner({
	severity,
	title,
	body,
}: {
	severity: Severity;
	title: string;
	body?: string;
}) {
	const tone = bannerTone[severity];
	return (
		<div
			className={cn(
				"relative mt-2 h-[5.25rem] overflow-hidden rounded-md py-2 pr-2.5 pl-3.5",
				tone.box,
			)}
		>
			<span
				className={cn("absolute inset-y-0 left-0 w-1", tone.bar)}
				aria-hidden
			/>
			<p
				className={cn("text-[0.8125rem] leading-[1.1rem] font-bold", tone.text)}
			>
				{title}
			</p>
			{body ? (
				<p className="mt-0.5 line-clamp-3 text-xs leading-4 text-balance">
					{body}
				</p>
			) : null}
		</div>
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
	const critical = severity === "critical";

	return (
		<div
			role="img"
			aria-label={`MetaMask transaction request. Insights from Codemark: ${title}`}
			className="w-full max-w-[24rem] overflow-hidden rounded-2xl bg-white font-[system-ui,sans-serif] text-[#121314] shadow-[0_1.5rem_4rem_rgb(0_0_0_/_0.45)]"
		>
			<div className="flex items-center justify-between gap-3 border-b border-[#b4b4b566] px-4 py-2.5">
				<span className="flex items-center gap-2 text-[0.8125rem] font-semibold">
					<MetaMaskFox className="size-5" />
					MetaMask
				</span>
				<span className="rounded-full bg-[#f3f5f9] px-2.5 py-1 text-xs font-medium">
					Sepolia
				</span>
			</div>
			<div className="px-4 pt-3 pb-4">
				<p className="text-center text-lg font-bold">Transaction request</p>
				<div className="mt-3 divide-y divide-white rounded-lg bg-[#f3f5f9]">
					<InfoRow label="Request from">app.pwnmeswap.eth</InfoRow>
					<InfoRow label={roleLabel[result.target.role]}>
						{shortAddress(result.target.address)}
					</InfoRow>
				</div>
				<div className="mt-2 rounded-lg bg-[#f3f5f9] p-3">
					<p className="text-[0.8125rem] font-semibold">
						Insights from Codemark
					</p>
					<motion.div
						key={example.name}
						initial={reduced ? false : { opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ duration: 0.2 }}
					>
						<InsightBanner severity={severity} title={title} body={body} />
					</motion.div>
					<ul key={`${example.name}-steps`} className="mt-2 h-[7.5rem]">
						{steps.map((step, index) => (
							<StepRow key={step.id} step={step} index={index} />
						))}
					</ul>
				</div>
				<div className="mt-3 flex h-9 items-start gap-2 text-xs leading-4">
					{critical ? (
						<>
							<span
								className="mt-0.5 size-3.5 shrink-0 rounded-[0.2rem] border border-[#ca3542]"
								aria-hidden
							/>
							I have acknowledged the risk and still want to proceed
						</>
					) : null}
				</div>
				<div className="mt-1 grid grid-cols-2 gap-2" aria-hidden>
					<span className="grid h-10 place-items-center rounded-xl border border-[#121314] text-sm font-medium">
						Cancel
					</span>
					<span
						className={cn(
							"grid h-10 place-items-center rounded-xl text-sm font-medium text-white transition-colors",
							critical ? "bg-[#ca3542]" : "bg-[#4459ff]",
						)}
					>
						Confirm
					</span>
				</div>
			</div>
		</div>
	);
}
