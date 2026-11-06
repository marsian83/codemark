import { Heading, Section } from "./Section";

const limits = [
	{
		question: "Is the code safe?",
		answer:
			"Codemark checks who published it, not what it does. Read the audit too.",
	},
	{
		question: "What if a team hasn't joined?",
		answer:
			"Their contracts come back as unknown. Teams have to publish, and wallets have to run the check.",
	},
	{
		question: "What about imitators?",
		answer:
			"They can register a similar name, but they can't publish under the real one. Pin the real name, and an imitator shows up as a publisher you haven't pinned.",
	},
	{
		question: "Does it work on mainnet?",
		answer: "Not yet. Codemark runs on Sepolia today.",
	},
];

export function Limits() {
	return (
		<Section>
			<Heading>What to know before you rely on Codemark</Heading>
			<dl className="mt-10 grid gap-px overflow-hidden bg-hairline md:grid-cols-2">
				{limits.map((limit) => (
					<div key={limit.question} className="bg-night p-6 sm:p-8">
						<dt className="flex items-start gap-3 font-display text-2xl leading-tight sm:text-3xl">
							<span
								aria-hidden
								className="cartouche mt-1 grid size-7 shrink-0 place-items-center bg-flare font-text text-base font-bold text-night [--chamfer:0.3rem]"
							>
								?
							</span>
							{limit.question}
						</dt>
						<dd className="mt-3 pl-10 text-lg leading-7 text-balance text-sand">
							{limit.answer}
						</dd>
					</div>
				))}
			</dl>
		</Section>
	);
}
