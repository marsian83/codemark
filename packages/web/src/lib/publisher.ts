import { labelId } from "@codemark/shared";
import type { ReleaseColumns } from "@codemark/shared/arkiv/rows";
import { createArkivSource } from "@codemark/shared/arkiv/source";
import { registryAbi } from "@codemark/shared/ens/abi";
import type { EnsClient } from "@codemark/shared/ens/client";
import { resolvePubRegistry } from "@codemark/shared/ens/publisher";
import { findResolver, readText } from "@codemark/shared/ens/resolve";
import { ROOT_RESOURCE, registryRoles } from "@codemark/shared/ens/roles";
import { keysRecordKey, parseKeys } from "@codemark/shared/record";
import { type Address, zeroAddress } from "viem";
import { arkivReader } from "./rpc";

export type KeyStatus = "live" | "cut" | "lapsed";

export type KeyInfo = {
	label: string;
	registry: Address;
	status: KeyStatus;
	expiry?: number;
};

export type PublisherView = {
	name: string;
	block: bigint;
	now: number;
	pubRegistry?: Address;
	keys: KeyInfo[];
	keysRecordFound: boolean;
};

export async function loadPublisher(
	ens: EnsClient,
	name: string,
): Promise<PublisherView> {
	const head = await ens.publicClient.getBlock({ blockTag: "latest" });
	const block = head.number;
	const now = Number(head.timestamp);
	const lookup = await findResolver(ens, name, block);
	let keyLabels: string[] = [];
	let keysRecordFound = false;
	if (lookup.resolver !== zeroAddress && !lookup.inherited) {
		try {
			const text = await readText(
				ens,
				lookup.resolver,
				name,
				keysRecordKey,
				block,
			);
			keyLabels = parseKeys(text);
			keysRecordFound = keyLabels.length > 0;
		} catch {
			keyLabels = [];
		}
	}
	const pubRegistry = await resolvePubRegistry(ens, name, block).catch(
		() => undefined,
	);
	const keys: KeyInfo[] = [];
	if (pubRegistry) {
		for (const label of keyLabels) {
			const registry = await ens.publicClient.readContract({
				address: pubRegistry,
				abi: registryAbi,
				functionName: "getSubregistry",
				args: [label],
				blockNumber: block,
			});
			let expiry: number | undefined;
			try {
				const e = await ens.publicClient.readContract({
					address: pubRegistry,
					abi: registryAbi,
					functionName: "getExpiry",
					args: [labelId(label)],
					blockNumber: block,
				});
				expiry = Number(e);
			} catch {
				expiry = undefined;
			}
			const mounted = registry !== zeroAddress;
			const lapsed =
				mounted && expiry !== undefined && expiry !== 0 && expiry <= now;
			keys.push({
				label,
				registry,
				status: !mounted ? "cut" : lapsed ? "lapsed" : "live",
				expiry,
			});
		}
	}
	return { name, block, now, pubRegistry, keys, keysRecordFound };
}

export type ReleaseWithTime = ReleaseColumns & { registeredAt?: number };

async function timestampOf(ens: EnsClient, block: bigint) {
	try {
		const b = await ens.publicClient.getBlock({ blockNumber: block });
		return Number(b.timestamp);
	} catch {
		return undefined;
	}
}

export async function loadReleases(
	ens: EnsClient,
	registry: Address,
): Promise<{ rows: ReleaseWithTime[]; rejected: number }> {
	const source = createArkivSource(arkivReader);
	const found = await source.findReleasesByKeyRegistry(registry);
	const rows: ReleaseWithTime[] = [];
	let rejected = found.malformed;
	for (const { row, meta } of found.rows) {
		const authentic =
			meta.readonly &&
			meta.creator.toLowerCase() === meta.owner.toLowerCase() &&
			(await ens.publicClient.readContract({
				address: registry,
				abi: registryAbi,
				functionName: "hasRoles",
				args: [ROOT_RESOURCE, registryRoles.ROLE_REGISTRAR, meta.creator],
			}));
		if (!authentic) {
			rejected++;
			continue;
		}
		rows.push(row);
	}
	const blocks = [...new Set(rows.map((r) => r.regBlock))].slice(0, 50);
	const times = new Map<bigint, number | undefined>();
	await Promise.all(
		blocks.map(async (b) => times.set(b, await timestampOf(ens, b))),
	);
	for (const r of rows) r.registeredAt = times.get(r.regBlock);
	return { rows, rejected };
}
