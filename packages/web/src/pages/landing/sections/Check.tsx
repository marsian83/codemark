import type { Severity } from "@codemark/shared/verdict";
import { useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { cn } from "../../../utils/cn";
import { WalletPrompt } from "../check/WalletPrompt";
import { verdictExamples } from "../verdicts";
import { Heading, Lede, Section } from "./Section";

const holdMs = 3400;

const dot: Record<Severity, string> = {
	info: "bg-signal",
	amber: "bg-fox",
	warning: "bg-fox",
	critical: "bg-flare",
};

export function Check() {
	const [index, setIndex] = useState(0);
	const [picked, setPicked] = useState(false);
	const frame = useRef<HTMLDivElement>(null);
	const seen = useInView(frame, { amount: 0.4 });
	const reduced = useReducedMotion();

	useEffect(() => {
		if (!seen || picked || reduced) return;
		const timer = setInterval(
			() => setIndex((current) => (current + 1) % verdictExamples.length),
			holdMs,
		);
		return () => clearInterval(timer);
	}, [seen, picked, reduced]);

	const example = verdictExamples[index];

	return (
		<Section>
			<div
				ref={frame}
				className="grid items-center gap-12 lg:grid-cols-[1fr_24rem] lg:gap-20"
			>
				<div className="min-w-0">
					<Heading>What your wallet tells you before you sign</Heading>
					<Lede className="mt-6">
						Codemark reads the transaction your wallet is about to sign, not
						what the site shows you. Then it checks every contract the
						transaction touches against the teams you've pinned.
					</Lede>
					<p className="mt-8 text-sm font-medium text-sand-2">
						Choose a result to see it in MetaMask
					</p>
					<div className="mt-2 grid max-w-xl grid-cols-2 gap-2 sm:grid-cols-3">
						{verdictExamples.map((item, itemIndex) => (
							<button
								key={item.name}
								type="button"
								aria-pressed={itemIndex === index}
								onClick={() => {
									setPicked(true);
									setIndex(itemIndex);
								}}
								className={cn(
									"cartouche flex h-11 cursor-pointer items-center gap-2.5 px-3.5 text-sm font-medium whitespace-nowrap outline-none transition-colors [--chamfer:0.375rem] focus-visible:outline-2",
									itemIndex === index
										? "bg-sand text-night"
										: "bg-sand/10 text-sand hover:bg-sand/20",
								)}
							>
								<span
									className={cn(
										"size-2.5 shrink-0 rounded-full",
										dot[item.severity],
									)}
									aria-hidden
								/>
								{item.name}
							</button>
						))}
					</div>
					<p className="mt-4 min-h-7 max-w-xl text-lg leading-7 text-sand">
						{example.meaning}
					</p>
					<p className="mt-4 max-w-xl text-base leading-7 text-sand-2">
						Account upgrades get a stricter check. Anything except a pinned,
						proven release at least 24 hours old gets the strongest warning.
					</p>
				</div>
				<WalletPrompt example={example} />
			</div>
		</Section>
	);
}
