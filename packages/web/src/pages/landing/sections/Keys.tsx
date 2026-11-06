import { DitherArt } from "../art/DitherArt";
import type { Inks, LightField } from "../art/dither";
import { hardwareField, pipelineField, safeField } from "../art/fields";
import { Heading, Section } from "./Section";

const keys: {
	name: string;
	role: string;
	field: LightField;
	inks: Inks;
	can: string;
	cannot: string;
}[] = [
	{
		name: "Team Safe",
		role: "The root",
		field: safeField,
		inks: { low: "#b58a4a", high: "#f4cb7e" },
		can: "Create keys, publish account upgrades and pull releases.",
		cannot: "Nothing is out of its reach, so use a multisig.",
	},
	{
		name: "CI key",
		role: "Your release pipeline",
		field: pipelineField,
		inks: { low: "#cd6116", high: "#f6851b" },
		can: "Add new releases. If stolen, it can publish ordinary ones until you cut it.",
		cannot: "Remove or change releases, or publish account upgrades.",
	},
	{
		name: "Security key",
		role: "On hardware",
		field: hardwareField,
		inks: { low: "#3f9f88", high: "#7fd8be" },
		can: "Cut a key and record why.",
		cannot: "Publish anything.",
	},
];

function Mark({ allowed }: { allowed: boolean }) {
	return (
		<svg viewBox="0 0 12 12" aria-hidden className="size-4 shrink-0">
			<path
				d={allowed ? "M2.5 6.5 5 9l4.5-5.5" : "M3 3l6 6m0-6l-6 6"}
				fill="none"
				stroke={allowed ? "#7fd8be" : "#ff7a5e"}
				strokeWidth="1.8"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

export function Keys() {
	return (
		<Section>
			<Heading>Each key can only do its own job</Heading>
			<div className="mt-10 divide-y divide-hairline border-y border-hairline">
				{keys.map((key) => (
					<article
						key={key.name}
						className="grid items-center gap-x-10 gap-y-4 py-5 md:grid-cols-[11rem_12rem_1fr_1fr]"
					>
						<div className="size-40 md:size-44">
							<DitherArt field={key.field} inks={key.inks} cell={3} />
						</div>
						<div>
							<h3 className="font-display text-3xl leading-tight">
								{key.name}
							</h3>
							<p className="mt-1 text-base text-sand-2">{key.role}</p>
						</div>
						<dl>
							<dt className="flex items-center gap-2 text-base font-semibold text-signal">
								<Mark allowed />
								Can
							</dt>
							<dd className="mt-1 text-base leading-6 text-sand">{key.can}</dd>
						</dl>
						<dl>
							<dt className="flex items-center gap-2 text-base font-semibold text-flare">
								<Mark allowed={false} />
								Can't
							</dt>
							<dd className="mt-1 text-base leading-6 text-sand">
								{key.cannot}
							</dd>
						</dl>
					</article>
				))}
			</div>
		</Section>
	);
}
