import {
	explain,
	notices,
	roleLabel,
	type StepState,
	trustPath,
} from "@codemark/shared/check/explain";
import type { Thresholds } from "@codemark/shared/check/severity";
import type {
	PublisherVerdict,
	TargetResult,
} from "@codemark/shared/check/types";
import type { Severity } from "@codemark/shared/verdict";
import {
	Address,
	Banner,
	Box,
	Divider,
	Icon,
	Row,
	Section,
	Text,
} from "@metamask/snaps-sdk/jsx";
import type { PinCheck } from "./pins";

const bannerSeverity: Record<
	Severity,
	"success" | "info" | "warning" | "danger"
> = {
	info: "success",
	amber: "info",
	warning: "warning",
	critical: "danger",
};

const stepIcon: Record<
	StepState,
	{
		name: "check" | "minus" | "close" | "full-circle";
		color: "success" | "warning" | "error" | "muted";
	}
> = {
	ok: { name: "check", color: "success" },
	caution: { name: "minus", color: "warning" },
	fail: { name: "close", color: "error" },
	open: { name: "full-circle", color: "muted" },
};

function Path({
	v,
	r,
	thresholds,
}: {
	v: PublisherVerdict;
	r: TargetResult;
	thresholds: Thresholds;
}) {
	const steps = trustPath(v, r.target.role, thresholds);
	return (
		<Section>
			{steps.map((step) => (
				<Box>
					<Box direction="horizontal" crossAlignment="center">
						<Icon
							name={stepIcon[step.state].name}
							color={stepIcon[step.state].color}
							size="md"
						/>
						<Text
							fontWeight="medium"
							color={step.state === "open" ? "muted" : "default"}
						>
							{step.value ? `${step.label}: ${step.value}` : step.label}
						</Text>
					</Box>
					{step.note && step.state !== "ok" ? (
						<Text
							size="sm"
							color={step.state === "fail" ? "error" : "alternative"}
						>
							{step.note}
						</Text>
					) : null}
				</Box>
			))}
		</Section>
	);
}

function TargetBlock({
	r,
	thresholds,
}: {
	r: TargetResult;
	thresholds: Thresholds;
}) {
	const { title, body } = explain(r, thresholds);
	return (
		<Box>
			<Banner title={title} severity={bannerSeverity[r.severity]}>
				<Text>{body || " "}</Text>
			</Banner>
			<Row label={roleLabel[r.target.role]}>
				<Address address={r.target.address} />
			</Row>
			{r.verdicts
				.filter((v) => v.key || v.release || v.verdict !== "UNKNOWN")
				.map((v) => (
					<Path v={v} r={r} thresholds={thresholds} />
				))}
			{notices(r).map((n) => (
				<Text size="sm" color={n.tone === "error" ? "error" : "alternative"}>
					{n.text}
				</Text>
			))}
		</Box>
	);
}

export function Report({
	results,
	changedPins,
	unverified = [],
	thresholds,
	note,
}: {
	results: TargetResult[];
	changedPins: PinCheck[];
	unverified?: PinCheck[];
	thresholds: Thresholds;
	note?: string;
}) {
	return (
		<Box>
			{changedPins.map((p) => (
				<Box>
					<Banner
						title={`${p.pin.name} changed since you pinned it`}
						severity="danger"
					>
						<Text>
							It now points to a different registry. Don't sign until you've
							confirmed the team moved it on purpose, then pin it again.
						</Text>
					</Banner>
					<Row label="Pinned registry">
						<Address address={p.pin.pubRegistry} />
					</Row>
					{p.current ? (
						<Row label="Current registry">
							<Address address={p.current} />
						</Row>
					) : (
						<Row label="Current registry">
							<Text>Not found</Text>
						</Row>
					)}
					<Divider />
				</Box>
			))}
			{unverified.length > 0 ? (
				<Banner title="Couldn't confirm your pins" severity="warning">
					<Text>
						{`Couldn't read the registry behind ${unverified.map((p) => p.pin.name).join(", ")}, so a change can't be ruled out.`}
					</Text>
				</Banner>
			) : null}
			{results.map((r, i) => (
				<Box>
					<TargetBlock r={r} thresholds={thresholds} />
					{i < results.length - 1 ? <Divider /> : null}
				</Box>
			))}
			{note ? <Text fontWeight="medium">{note}</Text> : null}
		</Box>
	);
}

export function Failure({ message }: { message: string }) {
	return (
		<Banner title="Codemark couldn't check this" severity="warning">
			<Text>{message}</Text>
			<Text>Nothing here is verified. Treat every address as unknown.</Text>
		</Banner>
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
			{replacing ? (
				<Banner title={`Replace your pin for ${name}?`} severity="warning">
					<Text>
						This name is already pinned to a different registry. Only accept if
						you know the team moved it.
					</Text>
				</Banner>
			) : (
				<Banner title={`Pin ${name}?`} severity="info">
					<Text>
						Its releases will count as verified, and a key it revokes will block
						signing.
					</Text>
				</Banner>
			)}
			<Row label="Name">
				<Text>{name}</Text>
			</Row>
			{replacing ? (
				<Row label="Old registry">
					<Address address={previous as `0x${string}`} />
				</Row>
			) : null}
			<Row label={replacing ? "New registry" : "Registry"}>
				<Address address={registry as `0x${string}`} />
			</Row>
		</Box>
	);
}

export function UnpinConfirm({ name }: { name: string }) {
	return (
		<Banner title={`Unpin ${name}?`} severity="info">
			<Text>Its releases will no longer count as verified.</Text>
		</Banner>
	);
}
