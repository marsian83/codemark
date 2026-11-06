import { Code } from "../code/Code";
import { Heading, Lede, Section } from "./Section";

const features = [
	{
		name: "Registries",
		detail: "A key is a branch you can remove in one transaction.",
	},
	{
		name: "Roles",
		detail: '"May add" and "may remove" are separate permissions.',
	},
	{
		name: "Expiry",
		detail: "A key's 90-day lifetime bounds every release under it.",
	},
];

export function Foundations() {
	return (
		<Section>
			<Heading size="md">
				A key can be revoked because ENSv2 gave every name its own registry
			</Heading>
			<Lede className="mt-8">
				On ENSv1, deleting <Code text="ci-1.acme.eth" className="text-base" />{" "}
				leaves{" "}
				<code className="font-label text-base text-sand">
					router.ci-1.acme.eth
				</code>{" "}
				resolving. On ENSv2, removing a branch ends everything under it.
			</Lede>
			<dl className="mt-12 grid gap-8 md:grid-cols-3">
				{features.map((feature) => (
					<div key={feature.name}>
						<dt className="font-display text-3xl">{feature.name}</dt>
						<dd className="mt-2 text-base leading-7 text-sand">
							{feature.detail}
						</dd>
					</div>
				))}
			</dl>
			<p className="mt-12 max-w-2xl text-lg leading-8 text-sand-2">
				<span className="font-medium text-sand">
					Arkiv is the index, and ENS is the proof.
				</span>{" "}
				Arkiv finds who claims an address and why a release was withdrawn. Every
				row is rechecked against ENS, so a forged or flooded index can't turn
				anything green.
			</p>
		</Section>
	);
}
