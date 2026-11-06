import { useReducedMotion } from "motion/react";
import type { MouseEvent } from "react";
import { Link } from "react-router-dom";
import { actionVariants } from "../../../ui/action";
import { Code } from "../code/Code";
import { stopsFor } from "../sectionStops";
import { verifiedLine } from "../verdicts";
import { audiencesId } from "./Audiences";

export function Hero() {
	const reduced = useReducedMotion();

	function goToAudiences(event: MouseEvent) {
		const target = document.getElementById(audiencesId);
		if (!target) return;
		event.preventDefault();
		window.scrollTo({
			top: stopsFor(target)[0],
			behavior: reduced ? "auto" : "smooth",
		});
	}

	return (
		<section className="relative mx-auto flex min-h-dvh w-full max-w-[84rem] flex-col justify-between px-5 pt-24 pb-6 sm:px-10 sm:pt-28">
			<div>
				<h1 className="max-w-[14em] font-display text-balance text-[clamp(2.75rem,min(6vw,11dvh),6rem)] leading-[1.02]">
					See who published a contract before you sign
				</h1>
				<p className="mt-6 max-w-2xl text-lg leading-8 text-sand">
					Codemark checks the contract or account upgrade you're about to sign.
					You'll see which team released it and whether they've withdrawn it.
				</p>
				<div className="mt-8 flex flex-wrap items-center gap-3">
					<Link to="/app" className={actionVariants()}>
						Check a contract
					</Link>
					<a
						href={`#${audiencesId}`}
						onClick={goToAudiences}
						className={actionVariants({ tone: "night" })}
					>
						Get started
					</a>
				</div>
			</div>
			<div className="cartouche mt-16 self-start bg-night px-4 py-2 font-label text-xs leading-5 [--chamfer:0.375rem] max-sm:hidden">
				<Code text={verifiedLine} className="block" />
				<p className="text-sand-2">
					Example from pwnmeswap.eth, a demo team on Sepolia
				</p>
			</div>
		</section>
	);
}
