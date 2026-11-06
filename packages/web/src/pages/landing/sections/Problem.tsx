import { IncidentReplay } from "../replay/IncidentReplay";
import { Heading } from "./Section";

export function Problem() {
	return (
		<section
			id="replay"
			className="mx-auto flex w-full max-w-[84rem] scroll-mt-0 flex-col px-5 pt-24 pb-6 sm:px-10 lg:h-dvh lg:min-h-[43rem]"
		>
			<div className="flex flex-col gap-2 pb-5">
				<Heading size="md" className="max-w-none">
					How billions left Bybit and Binance
				</Heading>
				<p className="text-base leading-6 text-sand">
					No contract was broken. Someone signed a transaction that pointed at
					the attacker's code, and the wallet couldn't say who published it.
				</p>
			</div>
			<IncidentReplay />
		</section>
	);
}
