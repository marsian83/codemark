import { CutDemo } from "../cut/CutDemo";
import { Heading, Section } from "./Section";

export function Cut() {
	return (
		<Section>
			<div className="grid items-center gap-12 lg:grid-cols-[1fr_1.15fr] lg:gap-16">
				<div className="min-w-0">
					<Heading size="md">
						One transaction withdraws everything a stolen key published
					</Heading>
					<p className="mt-6 max-w-xl text-lg leading-8 text-sand">
						Each signing key gets its own branch under your ENS name. If a key
						leaks, your security key removes that branch in one transaction.
					</p>
					<p className="mt-4 max-w-xl text-lg leading-8 text-sand">
						ENSv2 resolves names by walking down from the root, so nothing below
						the cut resolves any more, and there's no list of releases to chase.
						Then you mount a new key and republish the good releases.
					</p>
				</div>
				<CutDemo />
			</div>
		</Section>
	);
}
