import {
	type Address,
	type Hex,
	type TransactionReceipt,
	TransactionReceiptNotFoundError,
	toEventSelector,
} from "viem";
import type { Found, IncidentColumns } from "../arkiv/rows";
import { labelUnregisteredEvent, subregistryUpdatedEvent } from "../ens/events";
import { registryRoles } from "../ens/roles";
import { type ArtifactId, forwardLabel } from "../names";
import { sameLabel, splitReleaseName } from "./binding";
import { type Ctx, memo, registry, sameAddress } from "./chain";
import { getLogsRange } from "./logs";
import type { Publisher } from "./publisher";
import { incidentRowProblem, sanitizeReason } from "./rows";

export type Cut = {
	keyLabel?: string;
	keyRegistry: Address;
	reason: string;
	block: bigint;
};

export type Pull = {
	keyRegistry: Address;
	label: string;
	reason: string;
	block: bigint;
};

const unregisteredTopic = toEventSelector(labelUnregisteredEvent);

function receipt(ctx: Ctx, tx: Hex) {
	return memo(
		ctx,
		`rcpt:${tx}`,
		async (): Promise<TransactionReceipt | undefined> => {
			try {
				return await ctx.ens.publicClient.getTransactionReceipt({ hash: tx });
			} catch (err) {
				if (err instanceof TransactionReceiptNotFoundError) return undefined;
				throw err;
			}
		},
	);
}

async function unregisteredTokens(
	ctx: Ctx,
	tx: Hex,
	block: bigint,
	emitter: Address,
) {
	const r = await receipt(ctx, tx);
	if (
		r?.status !== "success" ||
		r.blockNumber !== block ||
		r.blockNumber > ctx.block
	)
		return [];
	return r.logs
		.filter(
			(l) =>
				sameAddress(l.address, emitter) &&
				l.topics[0] === unregisteredTopic &&
				l.topics[1],
		)
		.map((l) => BigInt(l.topics[1] as Hex));
}

async function signedBySecurity(ctx: Ctx, pub: Publisher, creator: Address) {
	if (!pub.pubRegistry) return false;
	return registry.hasRootRoles(
		ctx,
		pub.pubRegistry,
		registryRoles.ROLE_UNREGISTER,
		creator,
	);
}

export async function authenticateCut(
	ctx: Ctx,
	pub: Publisher,
	found: Found<IncidentColumns>,
): Promise<Cut | undefined> {
	if (incidentRowProblem(found, "cut") || !pub.pubRegistry) return undefined;
	const { row, meta } = found;
	let keyLabel: string | undefined;
	if (row.name !== undefined) {
		const dot = row.name.indexOf(".");
		if (dot <= 0 || row.name.slice(dot + 1) !== pub.name) return undefined;
		keyLabel = row.name.slice(0, dot);
	}
	if (!(await signedBySecurity(ctx, pub, meta.creator))) return undefined;
	const linkBlock = row.linkBlock as bigint;
	if (linkBlock > row.block) return undefined;
	const links = await getLogsRange(
		ctx,
		{
			address: pub.pubRegistry,
			event: subregistryUpdatedEvent,
			args: { subregistry: row.keyRegistry },
		},
		linkBlock,
		linkBlock,
	);
	const linked = links
		.map((l) => (l.topics[1] ? BigInt(l.topics[1]) : undefined))
		.filter(
			(t): t is bigint =>
				t !== undefined && (keyLabel === undefined || sameLabel(t, keyLabel)),
		);
	if (linked.length === 0) return undefined;
	const removed = await unregisteredTokens(
		ctx,
		row.ensTx,
		row.block,
		pub.pubRegistry,
	);
	if (!removed.some((t) => linked.some((k) => t >> 32n === k >> 32n)))
		return undefined;
	return {
		keyLabel,
		keyRegistry: row.keyRegistry,
		reason: sanitizeReason(row.reason),
		block: row.block,
	};
}

export async function authenticatePull(
	ctx: Ctx,
	pub: Publisher,
	found: Found<IncidentColumns>,
	artifact: ArtifactId,
): Promise<Pull | undefined> {
	if (incidentRowProblem(found, "pull") || !pub.pubRegistry) return undefined;
	const { row, meta } = found;
	if (row.artifact !== artifact || row.name === undefined) return undefined;
	const split = splitReleaseName(row.name);
	if (!split || split.publisher !== pub.name) return undefined;
	const live = await registry.subregistry(ctx, pub.pubRegistry, split.key);
	if (!sameAddress(live, row.keyRegistry)) return undefined;
	if (!(await signedBySecurity(ctx, pub, meta.creator))) return undefined;
	const label = forwardLabel(artifact);
	const removed = await unregisteredTokens(
		ctx,
		row.ensTx,
		row.block,
		row.keyRegistry,
	);
	if (!removed.some((t) => sameLabel(t, label))) return undefined;
	return {
		keyRegistry: row.keyRegistry,
		label,
		reason: sanitizeReason(row.reason),
		block: row.block,
	};
}

export function publisherOfIncident(found: Found<IncidentColumns>) {
	if (!found.row.name) return undefined;
	return splitReleaseName(found.row.name)?.publisher;
}
