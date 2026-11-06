import { motion, useInView, useReducedMotion } from "motion/react";
import { useRef } from "react";
import { Link } from "react-router-dom";
import { config } from "../../../lib/config";
import { actionVariants } from "../Action";
import { Code } from "../code/Code";
import { Heading, Section } from "./Section";

const workflow = `- uses: ./.github/actions/codemark-publish
  with:
    publisher: acmeswap.eth
    key: ci-1
    component: router
    version: \${{ steps.deployed.outputs.version }}
    target: \${{ steps.deployed.outputs.address }}
    ci-key: \${{ secrets.CODEMARK_CI_KEY }}`;

const result = [" ", "router 3.1.0 published under ci-1 · proven"];

function Workflow() {
	const reduced = useReducedMotion();
	const frame = useRef<HTMLPreElement>(null);
	const seen = useInView(frame, { once: true, amount: 0.5 });
	return (
		<pre
			ref={frame}
			className="cartouche mt-8 overflow-x-auto bg-night-2/95 p-5 text-xs leading-6 [--chamfer:0.75rem] sm:text-sm sm:leading-6"
		>
			{[...workflow.split("\n"), ...result].map((line, index) => (
				<motion.span
					key={line}
					className="block"
					initial={reduced ? false : { opacity: 0, x: -6 }}
					animate={seen ? { opacity: 1, x: 0 } : undefined}
					transition={{ delay: index * 0.09, duration: 0.2 }}
				>
					<Code text={line} />
				</motion.span>
			))}
		</pre>
	);
}

export function Audiences() {
	return (
		<Section>
			<div className="grid gap-20 md:grid-cols-[1fr_1.3fr] md:gap-16">
				<div className="min-w-0">
					<Heading size="md">For people who sign</Heading>
					<p className="mt-5 text-lg leading-8 text-sand">
						Install the Snap and pin the teams you trust. MetaMask then shows
						who published each contract before you sign. It works in MetaMask
						Flask today.
					</p>
					<Link
						to="/app"
						className={actionVariants({ tone: "quiet", className: "mt-8" })}
					>
						Install the Snap
					</Link>
				</div>
				<div className="min-w-0">
					<Heading size="md">For teams who ship</Heading>
					<p className="mt-5 text-lg leading-8 text-sand">
						Add one step to your release workflow and keep your security key on
						a hardware wallet. There's no Codemark contract to deploy or audit.
					</p>
					<Workflow />
					<a
						href={`${config.repoUrl}#github-action`}
						target="_blank"
						rel="noreferrer"
						className={actionVariants({ tone: "quiet", className: "mt-8" })}
					>
						Read the setup guide
					</a>
				</div>
			</div>
		</Section>
	);
}
