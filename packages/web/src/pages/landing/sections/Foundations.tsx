import { Code } from "../code/Code";
import { Heading, Lede, Section } from "./Section";

const features = [
	{
		name: "Registries",
		detail: "Each key is a branch you can remove in one transaction.",
	},
	{
		name: "Roles",
		detail: "Adding a release and removing one are separate permissions.",
	},
	{
		name: "Expiry",
		detail:
			"A key expires after 90 days, and every release under it goes with it.",
	},
];

export function Foundations() {
	return (
		<Section>
			<Heading size="md">Why this needs ENSv2</Heading>
			<Lede className="mt-8">
				On ENSv1, deleting <Code text="ci-1.acme.eth" className="text-base" />{" "}
				leaves{" "}
				<code className="font-label text-base text-sand">
					router.ci-1.acme.eth
				</code>{" "}
				resolving. On ENSv2, removing a name removes everything under it.
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
					Arkiv finds the claims, and ENS confirms them.
				</span>{" "}
				Arkiv shows who claims an address and why a release was withdrawn.
				Codemark rechecks every row against ENS, so a fake or flooded index
				can't mark anything as verified.
			</p>
		</Section>
	);
}
