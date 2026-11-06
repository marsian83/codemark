import type { Address, Hex } from "viem";
import { z } from "zod";
import type { ArtifactId } from "../names";

export type ReleaseColumns = {
	artifact: ArtifactId;
	keyRegistry: Address;
	publisher: string;
	keyLabel: string;
	name: string;
	labelhash: Hex;
	resolverBlock: bigint;
	regBlock: bigint;
	kind: "contract" | "web";
	version: string;
};

export type IncidentColumns = {
	action: "pull" | "cut";
	keyRegistry: Address;
	artifact?: ArtifactId;
	name?: string;
	reason: string;
	ensTx: Hex;
	block: bigint;
	linkBlock?: bigint;
};

const address = z.string().regex(/^0x[0-9a-fA-F]{40}$/);
const hex32 = z.string().regex(/^0x[0-9a-fA-F]{64}$/);
const artifact = z
	.string()
	.regex(/^(eip155:\d+:0x[0-9a-f]{40}|ipfs:[A-Za-z0-9]{10,})$/);
const label = z.string().min(1).max(256);

export const releaseColumns = z.object({
	artifact,
	keyRegistry: address,
	publisher: label,
	keyLabel: label,
	name: label,
	labelhash: hex32,
	resolverBlock: z.bigint().nonnegative(),
	regBlock: z.bigint().nonnegative(),
	kind: z.enum(["contract", "web"]),
	version: label,
});

export const incidentColumns = z.object({
	action: z.enum(["pull", "cut"]),
	keyRegistry: address,
	artifact: artifact.optional(),
	name: label.optional(),
	reason: z.string().refine((s) => new TextEncoder().encode(s).length <= 280),
	ensTx: hex32,
	block: z.bigint().nonnegative(),
	linkBlock: z.bigint().nonnegative().optional(),
});

export type Provenance = {
	entityKey: Hex;
	creator: Address;
	owner: Address;
	readonly: boolean;
	permissionlessExtension: boolean;
	createdBlock: bigint;
	expiresBlock: bigint;
	queryBlock: bigint;
};

export type Found<T> = { row: T; meta: Provenance };

export type ArkivFindOptions = { maxPages?: number };

export type ArkivFindResult<T> = {
	rows: Found<T>[];
	indexFlooded: boolean;
	incomplete: boolean;
	malformed: number;
};

export type ArkivSource = {
	findReleases(
		artifact: ArtifactId,
		opts?: ArkivFindOptions,
	): Promise<ArkivFindResult<ReleaseColumns>>;
	findReleasesByKeyRegistry(
		keyRegistry: Address,
		opts?: ArkivFindOptions,
	): Promise<ArkivFindResult<ReleaseColumns>>;
	findIncidentsByArtifact(
		artifact: ArtifactId,
		opts?: ArkivFindOptions,
	): Promise<ArkivFindResult<IncidentColumns>>;
	findIncidentsByKeyRegistry(
		keyRegistry: Address,
		opts?: ArkivFindOptions,
	): Promise<ArkivFindResult<IncidentColumns>>;
};
