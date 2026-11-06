import type { Severity } from "@codemark/shared/verdict";
import { useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { cn } from "../../../utils/cn";
import { WalletPrompt } from "../check/WalletPrompt";
import { verdictExamples } from "../verdicts";
import { Heading, Lede, Section } from "./Section";

const holdMs = 3400;

const activeTone: Record<Severity, string> = {
	info: "text-signal",
	amber: "text-fox",
	warning: "text-fox",
	critical: "text-flare",
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
				className="grid items-center gap-12 lg:grid-cols-[1fr_26rem] lg:gap-20"
			>
				<div className="min-w-0">
					<Heading>What your wallet tells you before you sign</Heading>
					<Lede className="mt-6">
						Codemark reads the transaction your wallet is about to sign, not
						what the site shows you. It checks each contract the call touches
						against the publishers you pinned.
					</Lede>
					<ul className="mt-8 flex flex-wrap gap-x-5 gap-y-1 font-display text-[clamp(1.5rem,2.4vw,2.125rem)]">
						{verdictExamples.map((item, itemIndex) => (
							<li key={item.name}>
								<button
									type="button"
									aria-pressed={itemIndex === index}
									onClick={() => {
										setPicked(true);
										setIndex(itemIndex);
									}}
									className={cn(
										"cursor-pointer outline-none transition-colors hover:text-sand focus-visible:underline",
										itemIndex === index
											? activeTone[item.severity]
											: "text-sand-3",
									)}
								>
									{item.name}
								</button>
							</li>
						))}
					</ul>
					<p className="mt-3 min-h-14 max-w-xl text-lg leading-7 text-sand">
						{example.meaning}
					</p>
					<p className="mt-4 max-w-xl text-base leading-7 text-sand-2">
						Account upgrades and delegatecalls get a stricter rule. Anything
						short of a pinned, proven release at least 24 hours old is critical,
						and MetaMask makes you confirm twice.
					</p>
				</div>
				<WalletPrompt example={example} />
			</div>
		</Section>
	);
}
