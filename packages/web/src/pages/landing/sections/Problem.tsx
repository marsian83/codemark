import { IncidentReplay } from "../replay/IncidentReplay";
import { Heading } from "./Section";

export function Problem() {
	return (
		<section
			id="replay"
			className="mx-auto flex w-full max-w-[84rem] scroll-mt-0 flex-col px-5 pt-24 pb-6 sm:px-10 lg:h-dvh lg:min-h-[43rem]"
		>
			<div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-3 pb-5 lg:flex-nowrap">
				<Heading size="md" className="lg:whitespace-nowrap">
					Neither attack broke a contract
				</Heading>
				<p className="max-w-lg text-base leading-6 text-sand">
					Each one got a signature pointing at code the team never published. A
					wallet has an address and no way to ask who published it.
				</p>
			</div>
			<IncidentReplay />
		</section>
	);
}
