import { explain, roleLabel } from "@codemark/shared/check/explain";
import { defaultThresholds } from "@codemark/shared/check/severity";
import { motion, useInView, useReducedMotion } from "motion/react";
import { useRef } from "react";
import { Link } from "react-router-dom";
import { config } from "../../../lib/config";
import { shortAddress } from "../../../lib/format";
import { actionVariants } from "../../../ui/action";
import { MetaMaskFox } from "../check/MetaMaskFox";
import { InfoRow, InsightBanner } from "../check/WalletPrompt";
import { Code } from "../code/Code";
import { verdictExamples } from "../verdicts";
import { Heading, Section } from "./Section";

export const audiencesId = "get-started";

const workflow = `- uses: ./.github/actions/codemark-publish
  with:
    publisher: pwnmeswap.eth
    key: ci-1
    component: router
    version: \${{ steps.deployed.outputs.version }}
    target: \${{ steps.deployed.outputs.address }}
    ci-key: \${{ secrets.CODEMARK_CI_KEY }}`;

const result = [" ", "router 3.1.0 published under ci-1 · proven"];

const lineStagger = 0.09;
const crossingStart = 1.1;
const crossingSeconds = 0.9;
const crossingPause = 3;

function Workflow({ seen }: { seen: boolean }) {
	const reduced = useReducedMotion();
	return (
		<pre className="cartouche h-full overflow-x-auto bg-night-2/95 p-5 text-xs leading-6 [--chamfer:0.75rem] sm:text-sm sm:leading-6">
			{[...workflow.split("\n"), ...result].map((line, index) => (
				<motion.span
					key={line}
					className="block"
					initial={reduced ? false : { opacity: 0, x: -6 }}
					animate={seen ? { opacity: 1, x: 0 } : undefined}
					transition={{ delay: index * lineStagger, duration: 0.2 }}
				>
					<Code text={line} />
				</motion.span>
			))}
		</pre>
	);
}

function WalletResult({ seen }: { seen: boolean }) {
	const reduced = useReducedMotion();
	const example = verdictExamples[0];
	const { title, body } = explain(example.result, defaultThresholds);
	return (
		<div
			role="img"
			aria-label={`MetaMask transaction request. Insights from Codemark: ${title}`}
			className="flex h-full flex-col overflow-hidden rounded-2xl bg-white font-[system-ui,sans-serif] text-[#121314] shadow-[0_1.5rem_4rem_rgb(0_0_0_/_0.45)]"
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
			<div className="flex flex-1 flex-col justify-end gap-2 p-3">
				<p className="text-center text-base font-bold">Transaction request</p>
				<div className="rounded-lg bg-[#f3f5f9]">
					<InfoRow label={roleLabel[example.result.target.role]}>
						{shortAddress(example.result.target.address)}
					</InfoRow>
				</div>
				<div className="rounded-lg bg-[#f3f5f9] p-3">
					<p className="text-[0.8125rem] font-semibold">
						Insights from Codemark
					</p>
					<motion.div
						initial={reduced ? false : { opacity: 0 }}
						animate={seen ? { opacity: 1 } : undefined}
						transition={{
							delay: crossingStart + crossingSeconds,
							duration: 0.25,
						}}
					>
						<InsightBanner
							severity={example.severity}
							title={title}
							body={body}
						/>
					</motion.div>
				</div>
			</div>
		</div>
	);
}

function Crossing({
	seen,
	axis,
	className,
}: {
	seen: boolean;
	axis: "left" | "top";
	className: string;
}) {
	const reduced = useReducedMotion();
	if (reduced) return null;
	return (
		<motion.span
			aria-hidden
			className={className}
			initial={{ opacity: 0 }}
			animate={
				seen ? { [axis]: ["0%", "100%"], opacity: [0, 1, 1, 0] } : undefined
			}
			transition={{
				delay: crossingStart,
				duration: crossingSeconds,
				ease: "easeInOut",
				repeat: Number.POSITIVE_INFINITY,
				repeatDelay: crossingPause,
			}}
		/>
	);
}

function Seam({ seen }: { seen: boolean }) {
	return (
		<div
			aria-hidden
			className="relative mx-auto h-20 w-px lg:row-span-3 lg:grid lg:h-auto lg:w-full lg:grid-rows-subgrid"
		>
			<span className="absolute inset-y-0 left-1/2 w-px bg-sand/25" />
			<Crossing
				seen={seen}
				axis="top"
				className="absolute left-1/2 size-2 -translate-1/2 rounded-full bg-signal lg:hidden"
			/>
			<div className="relative row-start-2 hidden lg:block">
				<span className="absolute inset-x-0 bottom-8 h-px bg-signal/60" />
				<div className="absolute inset-x-0 bottom-8 h-px">
					<Crossing
						seen={seen}
						axis="left"
						className="absolute top-1/2 size-2 -translate-1/2 rounded-full bg-signal"
					/>
				</div>
			</div>
		</div>
	);
}

const sideClass =
	"flex min-w-0 flex-col gap-8 lg:row-span-3 lg:grid lg:grid-rows-subgrid";

export function Audiences() {
	const stage = useRef<HTMLDivElement>(null);
	const seen = useInView(stage, { once: true, amount: 0.4 });
	return (
		<Section>
			<div
				ref={stage}
				id={audiencesId}
				className="grid scroll-mt-24 gap-y-8 lg:grid-cols-[minmax(0,1.2fr)_5rem_minmax(0,1fr)] lg:grid-rows-[auto_auto_auto]"
			>
				<div className={sideClass}>
					<div>
						<Heading size="md">For teams who ship</Heading>
						<p className="mt-5 text-lg leading-8 text-sand">
							Add one step to your release workflow and keep your security key
							on a hardware wallet. There's no Codemark contract to deploy or
							audit.
						</p>
					</div>
					<Workflow seen={seen} />
					<div>
						<a
							href={`${config.repoUrl}#github-action`}
							target="_blank"
							rel="noreferrer"
							className={actionVariants({ tone: "quiet" })}
						>
							Read the setup guide
						</a>
					</div>
				</div>
				<Seam seen={seen} />
				<div className={sideClass}>
					<div>
						<Heading size="md">For people who sign</Heading>
						<p className="mt-5 text-lg leading-8 text-sand">
							Install the Snap and pin the teams you trust. MetaMask then shows
							who published each contract before you sign. It works in MetaMask
							Flask today.
						</p>
					</div>
					<WalletResult seen={seen} />
					<div>
						<Link to="/app" className={actionVariants({ tone: "quiet" })}>
							Install the Snap
						</Link>
					</div>
				</div>
			</div>
		</Section>
	);
}
