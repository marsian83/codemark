import { asc, eq } from "@arkiv-network/sdk/query";
import { addr, str } from "@arkiv-network/sdk/schema";
import { type Address, getAddress, type Hex } from "viem";
import type { z } from "zod";
import type { ArtifactId } from "../names";
import type { ArkivReader } from "./client";
import {
	type ArkivFindOptions,
	type ArkivFindResult,
	type ArkivSource,
	type Found,
	type IncidentColumns,
	incidentColumns,
	type ReleaseColumns,
	releaseColumns,
} from "./rows";
import { Incidents, Releases } from "./schemas";

const PAGE = 100;

type Fields = {
	$key: Hex;
	$creator: Address;
	$owner: Address;
	$createdAt: bigint;
	$expiresAt: bigint;
	$creationFlags: { readonly: boolean; permissionlessExtension: boolean };
};

function plain(row: Fields): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	for (const [k, v] of Object.entries(row)) {
		if (k.startsWith("$") || typeof v !== "object" || v === null) continue;
		out[k] = (v as unknown as { value: unknown }).value;
	}
	return out;
}

async function collect<T>(
	pages: (offset: number) => Promise<{
		entities: readonly unknown[];
		blockNumber: bigint;
		skipped: number;
		count: bigint;
	}>,
	parser: z.ZodType<T>,
	opts: ArkivFindOptions | undefined,
): Promise<ArkivFindResult<T>> {
	const maxPages = opts?.maxPages ?? 3;
	const rows: Found<T>[] = [];
	let malformed = 0;
	let indexFlooded = false;
	let incomplete = false;
	let seen = 0;
	let count0: bigint | undefined;
	for (let page = 0; page < maxPages; page++) {
		const res = await pages(page * PAGE);
		malformed += res.skipped;
		seen += res.entities.length + res.skipped;
		if (count0 === undefined) count0 = res.count;
		else if (res.count !== count0) incomplete = true;
		for (const e of res.entities as Fields[]) {
			const parsed = parser.safeParse(plain(e));
			if (!parsed.success) {
				malformed++;
				continue;
			}
			rows.push({
				row: parsed.data,
				meta: {
					entityKey: e.$key,
					creator: e.$creator,
					owner: e.$owner,
					readonly: e.$creationFlags.readonly,
					permissionlessExtension: e.$creationFlags.permissionlessExtension,
					createdBlock: e.$createdAt,
					expiresBlock: e.$expiresAt,
					queryBlock: res.blockNumber,
				},
			});
		}
		const total = res.entities.length + res.skipped;
		if (total < PAGE) {
			if (BigInt(seen) < (count0 ?? 0n)) incomplete = true;
			return { rows, indexFlooded: false, incomplete, malformed };
		}
		if (page === maxPages - 1) indexFlooded = BigInt(seen) < (count0 ?? 0n);
	}
	return { rows, indexFlooded, incomplete, malformed };
}

export function createArkivSource(client: ArkivReader): ArkivSource {
	return {
		findReleases(artifact: ArtifactId, opts) {
			return collect<ReleaseColumns>(
				(offset) =>
					client
						.select()
						.from(Releases)
						.where(eq("artifact", str(artifact)))
						.orderBy(asc("$key"))
						.limit(PAGE)
						.offset(offset)
						.withCount()
						.fetch(),
				releaseColumns as unknown as z.ZodType<ReleaseColumns>,
				opts,
			);
		},
		findReleasesByKeyRegistry(keyRegistry: Address, opts) {
			return collect<ReleaseColumns>(
				(offset) =>
					client
						.select()
						.from(Releases)
						.where(eq("keyRegistry", addr(getAddress(keyRegistry))))
						.orderBy(asc("$key"))
						.limit(PAGE)
						.offset(offset)
						.withCount()
						.fetch(),
				releaseColumns as unknown as z.ZodType<ReleaseColumns>,
				opts,
			);
		},
		findIncidentsByArtifact(artifact: ArtifactId, opts) {
			return collect<IncidentColumns>(
				(offset) =>
					client
						.select()
						.from(Incidents)
						.where(eq("artifact", str(artifact)))
						.orderBy(asc("$key"))
						.limit(PAGE)
						.offset(offset)
						.withCount()
						.fetch(),
				incidentColumns as unknown as z.ZodType<IncidentColumns>,
				opts,
			);
		},
		findIncidentsByKeyRegistry(keyRegistry: Address, opts) {
			return collect<IncidentColumns>(
				(offset) =>
					client
						.select()
						.from(Incidents)
						.where(eq("keyRegistry", addr(getAddress(keyRegistry))))
						.orderBy(asc("$key"))
						.limit(PAGE)
						.offset(offset)
						.withCount()
						.fetch(),
				incidentColumns as unknown as z.ZodType<IncidentColumns>,
				opts,
			);
		},
	};
}
