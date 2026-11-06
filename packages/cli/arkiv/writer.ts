import { createWalletClient, ExpirationTime } from "@arkiv-network/sdk";
import { rabdi } from "@arkiv-network/sdk/chains";
import { addr, str, u64 } from "@arkiv-network/sdk/schema";
import {
	type IncidentColumns,
	incidentColumns,
	type ReleaseColumns,
	releaseColumns,
} from "@codemark/shared/arkiv/rows";
import { Incidents, Releases } from "@codemark/shared/arkiv/schemas";
import { type Address, getAddress, type Hex, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

export type ReleaseRow = ReleaseColumns & { expiresAt: number };
export type IncidentRow = IncidentColumns;

export type WriteResult = { entityKey: Hex; txHash: Hex; expiresAt: bigint };

export type ArkivWriter = {
	address: Address;
	writeRelease(row: ReleaseRow): Promise<WriteResult>;
	writeIncident(row: IncidentRow): Promise<WriteResult>;
	extend(
		entityKey: Hex,
		kind: "release" | "incident",
		releaseExpiresAt?: number,
	): Promise<{ txHash: Hex; expiresAt: bigint }>;
};

const MAX_DAYS = 182;
const flags = { readonly: true, permissionlessExtension: true } as const;

export function releaseDeadline(releaseExpiresAt: number, nowMs = Date.now()) {
	const cap = nowMs + MAX_DAYS * 86_400_000;
	return new Date(Math.min(releaseExpiresAt * 1000, cap));
}

export function createArkivWriter(
	privateKey: Hex,
	accessKey: string,
): ArkivWriter {
	const account = privateKeyToAccount(privateKey);
	const client = createWalletClient({
		chain: rabdi({ accessKey }),
		transport: http(),
		account,
	});
	return {
		address: account.address,
		async writeRelease(input) {
			const { expiresAt, ...columns } = input;
			const row = { ...releaseColumns.parse(columns), expiresAt };
			if (row.expiresAt * 1000 <= Date.now()) {
				throw new Error("release expiry is in the past");
			}
			return client.createEntity(
				Releases,
				{
					artifact: str(row.artifact),
					keyRegistry: addr(getAddress(row.keyRegistry)),
					publisher: str(row.publisher),
					keyLabel: str(row.keyLabel),
					name: str(row.name),
					labelhash: str(row.labelhash),
					resolverBlock: u64(row.resolverBlock),
					regBlock: u64(row.regBlock),
					kind: str(row.kind),
					version: str(row.version),
				},
				{
					expiration: ExpirationTime.atDate(releaseDeadline(row.expiresAt)),
					flags,
				},
			);
		},
		async writeIncident(input) {
			const row = incidentColumns.parse(input);
			return client.createEntity(
				Incidents,
				{
					keyRegistry: addr(getAddress(row.keyRegistry)),
					action: str(row.action),
					reason: str(row.reason),
					ensTx: str(row.ensTx),
					block: u64(row.block),
					...(row.artifact === undefined
						? {}
						: { artifact: str(row.artifact) }),
					...(row.name === undefined ? {} : { name: str(row.name) }),
					...(row.linkBlock === undefined
						? {}
						: { linkBlock: u64(row.linkBlock) }),
				},
				{ expiration: ExpirationTime.max(), flags },
			);
		},
		async extend(entityKey, kind, releaseExpiresAt) {
			const expiration =
				kind === "incident" || releaseExpiresAt === undefined
					? ExpirationTime.max()
					: ExpirationTime.atDate(releaseDeadline(releaseExpiresAt));
			return client.extendEntity({ entityKey, expiration });
		},
	};
}
