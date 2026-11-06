import { motion, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { actionVariants } from "../../../ui/action";
import { cn } from "../../../utils/cn";
import { Code } from "../code/Code";
import { cliLine, type StageId, stages } from "./stages";

const holdMs = 4600;
const typeMs = 18;
const row = 44;
const mid = (index: number) => row * index + row / 2;

const routes = {
	ci: `M8 ${mid(0)} V${mid(1)} H28`,
	router: `M8 ${mid(0)} V${mid(1)} H28 V${mid(2)} H44`,
	portal: `M8 ${mid(0)} V${mid(1)} H28 V${mid(3)} H44`,
	delegate: `M8 ${mid(0)} V${mid(4)} H28 V${mid(5)} H44`,
};

function Pulse({
	d,
	delay,
	color,
}: {
	d: string;
	delay: number;
	color: string;
}) {
	return (
		<motion.path
			d={d}
			fill="none"
			stroke={color}
			strokeWidth="3"
			strokeLinecap="round"
			initial={{ pathLength: 0.14, pathOffset: 0, opacity: 0 }}
			animate={{ pathOffset: [0, 0.86], opacity: [0, 1, 1, 0] }}
			transition={{
				duration: 1.3,
				delay,
				repeat: Number.POSITIVE_INFINITY,
				repeatDelay: 1.3,
				ease: "linear",
			}}
		/>
	);
}

function Branches({ stage, reduced }: { stage: StageId; reduced: boolean }) {
	const severed = stage === "cut";
	const line = "rgb(246 232 214 / 0.45)";
	const branch = severed ? "#ff7a5e" : stage === "migrated" ? "#7fd8be" : line;
	return (
		<svg
			viewBox={`0 0 48 ${row * 6}`}
			aria-hidden
			className="absolute top-0 left-0 h-[16.5rem] w-12"
		>
			<path
				d={`M8 ${mid(0)} V${mid(4)} H28 V${mid(5)} H44`}
				fill="none"
				stroke={line}
				strokeWidth="1.5"
			/>
			<motion.path
				d={`M8 ${mid(1)} H28`}
				fill="none"
				stroke={branch}
				strokeWidth="1.5"
				initial={false}
				animate={{ pathLength: severed ? 0 : 1 }}
				transition={{ duration: 0.45 }}
			/>
			<motion.path
				d={`M28 ${mid(1)} V${mid(2)} H44 M28 ${mid(2)} V${mid(3)} H44`}
				fill="none"
				stroke={branch}
				strokeWidth="1.5"
				strokeDasharray={severed ? "3 5" : undefined}
				initial={false}
				animate={{ opacity: severed ? 0.7 : 1 }}
			/>
			{severed ? (
				<motion.path
					key="slash"
					d={`M14 ${mid(1) + 11} L22 ${mid(1) - 11}`}
					stroke="#ff7a5e"
					strokeWidth="3"
					strokeLinecap="round"
					initial={{ pathLength: 0 }}
					animate={{ pathLength: 1 }}
					transition={{ duration: 0.2 }}
				/>
			) : null}
			{reduced ? null : (
				<g key={stage}>
					{severed ? (
						<Pulse
							d={`M8 ${mid(0)} V${mid(1)} H14`}
							delay={0}
							color="#ff7a5e"
						/>
					) : (
						<>
							<Pulse d={routes.router} delay={0} color="#f6851b" />
							<Pulse d={routes.portal} delay={0.85} color="#f6851b" />
						</>
					)}
					<Pulse d={routes.delegate} delay={0.42} color="#f6851b" />
				</g>
			)}
		</svg>
	);
}

function TreeRow({
	indent,
	label,
	status,
	bad = false,
	good = false,
	struck = false,
	order = 0,
	stage,
}: {
	indent: string;
	label: string;
	status?: string;
	bad?: boolean;
	good?: boolean;
	struck?: boolean;
	order?: number;
	stage: StageId;
}) {
	const reduced = useReducedMotion();
	return (
		<motion.li
			className={cn(
				"flex h-11 items-center justify-between gap-3 font-label text-sm sm:text-base",
				indent,
			)}
			initial={false}
			animate={{ opacity: struck ? 0.72 : 1 }}
			transition={{ duration: 0.3, delay: order * 0.12 }}
		>
			<span
				className={cn(
					"min-w-0 truncate",
					struck ? "text-sand-2 line-through decoration-flare" : "text-sand",
				)}
			>
				{label}
			</span>
			{status ? (
				<motion.span
					key={`${stage}-${status}`}
					initial={reduced ? false : { opacity: 0, y: 6 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.22, delay: 0.1 + order * 0.14 }}
					className={cn(
						"shrink-0 text-sm",
						bad ? "text-flare" : good ? "text-signal" : "text-sand-2",
					)}
				>
					{status}
				</motion.span>
			) : null}
		</motion.li>
	);
}

function Typed({ text, reduced }: { text: string; reduced: boolean }) {
	const [shown, setShown] = useState(reduced ? text.length : 0);
	useEffect(() => {
		if (reduced) {
			setShown(text.length);
			return;
		}
		setShown(0);
		const timer = setInterval(
			() => setShown((count) => Math.min(text.length, count + 1)),
			typeMs,
		);
		return () => clearInterval(timer);
	}, [text, reduced]);
	return (
		<p className="h-10 overflow-hidden text-xs leading-5 whitespace-pre-wrap sm:h-5 sm:text-sm">
			<Code text={text.slice(0, shown)} />
			{shown < text.length ? <span className="text-fox">▌</span> : null}
		</p>
	);
}

export function CutDemo() {
	const reduced = Boolean(useReducedMotion());
	const [index, setIndex] = useState(0);
	const [taken, setTaken] = useState(false);
	const frame = useRef<HTMLDivElement>(null);
	const seen = useInView(frame, { amount: 0.4 });
	const stage = stages[index];
	const severed = stage.id === "cut";

	useEffect(() => {
		if (!seen || taken || reduced) return;
		const timer = setInterval(
			() => setIndex((current) => (current + 1) % stages.length),
			holdMs,
		);
		return () => clearInterval(timer);
	}, [seen, taken, reduced]);

	const releaseStatus = severed ? "key revoked" : "verified";

	return (
		<div
			ref={frame}
			className="cartouche min-w-0 bg-night-2/95 [--chamfer:1rem]"
		>
			<div className="border-b border-hairline px-5 py-4 sm:px-7">
				<p className="text-xs leading-5 whitespace-pre sm:text-sm">
					<Code text={cliLine} />
				</p>
				<Typed text={stage.command} reduced={reduced} />
				<p
					className={cn(
						"mt-1 font-label text-xs leading-5 sm:text-sm",
						severed ? "text-flare" : "text-signal",
					)}
				>
					{severed ? "✕" : "✓"} {stage.result}
				</p>
			</div>
			<div className="relative mx-5 my-3 sm:mx-7">
				<Branches stage={stage.id} reduced={reduced} />
				<ul className="relative">
					<TreeRow stage={stage.id} indent="pl-5" label="pwnmeswap.eth" />
					<TreeRow
						stage={stage.id}
						indent="pl-8"
						label={severed ? "ci-1" : stage.keyName}
						status={severed ? "unmounted" : "mounted"}
						bad={severed}
						good={!severed}
						struck={severed}
					/>
					<TreeRow
						stage={stage.id}
						indent="pl-12"
						label="router-3-1-0"
						status={releaseStatus}
						bad={severed}
						good={!severed}
						struck={severed}
						order={1}
					/>
					<TreeRow
						stage={stage.id}
						indent="pl-12"
						label="portal-2-0-0"
						status={releaseStatus}
						bad={severed}
						good={!severed}
						struck={severed}
						order={2}
					/>
					<TreeRow
						stage={stage.id}
						indent="pl-8"
						label="delegates"
						status="mounted"
						good
					/>
					<TreeRow
						stage={stage.id}
						indent="pl-12"
						label="delegate-1-0-0"
						status="verified"
						good
					/>
				</ul>
			</div>
			<div className="border-t border-hairline px-5 py-4 sm:px-7">
				<div className="flex items-center justify-between gap-4">
					<p className="text-sm font-medium text-sand-2">Your wallet shows</p>
					<button
						type="button"
						className={actionVariants({ size: "sm" })}
						onClick={() => {
							setTaken(true);
							setIndex((index + 1) % stages.length);
						}}
					>
						{stage.action}
					</button>
				</div>
				<p
					className="mt-2 overflow-x-auto text-xs leading-5 whitespace-nowrap sm:text-sm"
					aria-live="polite"
				>
					<Code text={stage.wallet} />
				</p>
			</div>
		</div>
	);
}
