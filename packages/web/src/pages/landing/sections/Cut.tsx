import { CutDemo } from "../cut/CutDemo";
import { Heading, Section } from "./Section";

export function Cut() {
	return (
		<Section>
			<div className="grid items-start gap-12 lg:grid-cols-[1fr_1.15fr] lg:gap-16">
				<div className="min-w-0">
					<Heading size="md">Cut off a stolen key in one transaction</Heading>
					<p className="mt-6 max-w-xl text-lg leading-8 text-sand">
						Each signing key has its own branch under your ENS name. If a key
						leaks, your security key removes that branch, and every release
						under it stops verifying.
					</p>
					<p className="mt-4 max-w-xl text-lg leading-8 text-sand">
						You don't have to hunt down releases one by one. Mount a new key and
						republish the good ones.
					</p>
				</div>
				<CutDemo />
			</div>
		</Section>
	);
}
