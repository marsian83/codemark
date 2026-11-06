import { Link } from "react-router-dom";
import { actionVariants } from "../Action";
import { Code } from "../code/Code";
import { verifiedLine } from "../verdicts";

export function Hero() {
	return (
		<section className="relative mx-auto flex min-h-dvh w-full max-w-[84rem] flex-col justify-between px-5 pt-24 pb-6 sm:px-10 sm:pt-28">
			<div>
				<h1 className="max-w-[8.4em] font-display text-[clamp(3rem,min(8vw,11.5dvh),6.75rem)] leading-[1.02]">
					Know who published it before you sign
				</h1>
				<p className="mt-6 max-w-xl text-lg leading-8 text-sand">
					Codemark checks that the contract or account upgrade in front of you
					came from the team you think, and that they haven't withdrawn it.
				</p>
				<div className="mt-8 flex flex-wrap items-center gap-3">
					<Link to="/app" className={actionVariants()}>
						Check a contract
					</Link>
					<a href="#replay" className={actionVariants({ tone: "night" })}>
						See how it works
					</a>
				</div>
			</div>
			<div className="cartouche mt-16 self-start bg-night px-4 py-2 font-label text-xs leading-5 [--chamfer:0.375rem]">
				<Code text={verifiedLine} className="block" />
				<p className="text-sand-2">
					acmeswap.eth is a demo publisher on Sepolia
				</p>
			</div>
		</section>
	);
}
