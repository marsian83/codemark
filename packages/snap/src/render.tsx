import type {
	PublisherVerdict,
	TargetResult,
} from "@codemark/shared/check/types";
import type { Severity } from "@codemark/shared/verdict";
import {
	Bold,
	Box,
	Divider,
	Heading,
	Row,
	Text,
} from "@metamask/snaps-sdk/jsx";
import type { PinCheck } from "./pins";

const severityTag: Record<Severity, string> = {
	info: "OK",
	amber: "CAUTION",
	warning: "WARNING",
	critical: "CRITICAL",
};

function ageText(seconds?: number) {
	if (seconds === undefined) return undefined;
	if (seconds < 3600) return `${Math.max(1, Math.round(seconds / 60))} min old`;
	if (seconds < 172800) return `${Math.round(seconds / 3600)} h old`;
	return `${Math.round(seconds / 86400)} d old`;
}

function releaseLine(v: PublisherVerdict) {
	const r = v.release;
	if (!r) return undefined;
	return [r.name, r.version && `v${r.version}`, ageText(r.ageSeconds)]
		.filter(Boolean)
		.join(" · ");
}

function VerdictRow({ v }: { v: PublisherVerdict }) {
	const who = `${v.publisher}${v.pinned ? " (pinned)" : ""}`;
	const release = releaseLine(v);
	return (
		<Box>
			<Row label={who}>
				<Text>{v.verdict}</Text>
			</Row>
			{release ? <Text>{release}</Text> : null}
			{v.reason ? <Text>{v.reason}</Text> : null}
		</Box>
	);
}

function TargetBlock({ r }: { r: TargetResult }) {
	return (
		<Box>
			<Heading>{`${severityTag[r.severity]}: ${r.headline}`}</Heading>
			<Row label={r.target.role}>
				<Text>{r.target.address}</Text>
			</Row>
			<Text>{r.target.via}</Text>
			{r.verdicts.map((v) => (
				<VerdictRow v={v} />
			))}
			{r.indexFlooded ? (
				<Text>The public index is flooded; open discovery is incomplete.</Text>
			) : null}
		</Box>
	);
}

export function Report({
	results,
	changedPins,
	unverified = [],
	note,
}: {
	results: TargetResult[];
	changedPins: PinCheck[];
	unverified?: PinCheck[];
	note?: string;
}) {
	return (
		<Box>
			{changedPins.map((p) => (
				<Box>
					<Heading>CRITICAL: pinned registry changed</Heading>
					<Text>
						{`${p.pin.name} now points to a different registry than the one you pinned. Re-confirm it from the Codemark pin screen before trusting it.`}
					</Text>
					<Row label="pinned">
						<Text>{p.pin.pubRegistry}</Text>
					</Row>
					<Row label="current">
						<Text>{p.current ?? "unknown"}</Text>
					</Row>
					<Divider />
				</Box>
			))}
			{unverified.length > 0 ? (
				<Box>
					<Heading>WARNING: could not verify pin</Heading>
					<Text>
						{`The registry behind ${unverified.map((p) => p.pin.name).join(", ")} could not be read, so a change to it cannot be ruled out.`}
					</Text>
					<Divider />
				</Box>
			) : null}
			{results.map((r, i) => (
				<Box>
					<TargetBlock r={r} />
					{i < results.length - 1 ? <Divider /> : null}
				</Box>
			))}
			{note ? (
				<Text>
					<Bold>{note}</Bold>
				</Text>
			) : null}
		</Box>
	);
}

export function Failure({ message }: { message: string }) {
	return (
		<Box>
			<Heading>WARNING: Codemark could not check this</Heading>
			<Text>{message}</Text>
			<Text>Nothing is verified. Treat every address here as unknown.</Text>
		</Box>
	);
}

export function PinConfirm({
	name,
	registry,
	previous,
}: {
	name: string;
	registry: string;
	previous?: string;
}) {
	const replacing =
		previous !== undefined && previous.toLowerCase() !== registry.toLowerCase();
	return (
		<Box>
			<Heading>
				{replacing ? "Replace pinned publisher" : "Pin publisher"}
			</Heading>
			{replacing ? (
				<Box>
					<Text>
						WARNING: this name already has a pin with a different registry.
						Accept only if you expected the publisher to move.
					</Text>
					<Row label="old registry">
						<Text>{previous}</Text>
					</Row>
				</Box>
			) : null}
			<Text>
				Releases from this publisher will count as trusted and its revocations
				as critical.
			</Text>
			<Row label="name">
				<Text>{name}</Text>
			</Row>
			<Row label={replacing ? "new registry" : "registry"}>
				<Text>{registry}</Text>
			</Row>
		</Box>
	);
}

export function UnpinConfirm({ name }: { name: string }) {
	return (
		<Box>
			<Heading>Unpin publisher</Heading>
			<Text>{`Stop trusting ${name}?`}</Text>
		</Box>
	);
}
