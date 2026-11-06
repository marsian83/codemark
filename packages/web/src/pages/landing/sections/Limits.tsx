import { Heading, Section } from "./Section";

const limits = [
	{
		name: "Whether code is safe",
		detail: "It tells you who published it, not what the code does.",
	},
	{
		name: "Whether a name is the real team",
		detail:
			"A lookalike can publish under its own name. Pinning is what protects you.",
	},
	{
		name: "Anything about teams who haven't joined",
		detail: "Teams have to publish and wallets have to run the check.",
	},
	{
		name: "Anything on mainnet yet",
		detail: "Codemark runs on Sepolia today.",
	},
];

export function Limits() {
	return (
		<Section>
			<Heading>What Codemark doesn't tell you</Heading>
			<dl className="mt-10 divide-y divide-hairline border-y border-hairline">
				{limits.map((limit) => (
					<div
						key={limit.name}
						className="grid gap-1 py-5 md:grid-cols-2 md:gap-8"
					>
						<dt className="text-lg font-semibold">{limit.name}</dt>
						<dd className="text-sand">{limit.detail}</dd>
					</div>
				))}
			</dl>
		</Section>
	);
}
