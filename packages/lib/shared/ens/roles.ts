import { encodeAbiParameters, type Hex, keccak256, toBytes, toHex } from "viem";

export const ALL_ROLES =
	0x1111111111111111111111111111111111111111111111111111111111111111n;
export const ADMIN_ROLES =
	0x1111111111111111111111111111111100000000000000000000000000000000n;
export const ROOT_RESOURCE = 0n;

const admin = (role: bigint) => role << 128n;

export const registryRoles = {
	ROLE_REGISTRAR: 1n << 0n,
	ROLE_REGISTRAR_ADMIN: admin(1n << 0n),
	ROLE_REGISTER_RESERVED: 1n << 4n,
	ROLE_REGISTER_RESERVED_ADMIN: admin(1n << 4n),
	ROLE_SET_PARENT: 1n << 8n,
	ROLE_SET_PARENT_ADMIN: admin(1n << 8n),
	ROLE_UNREGISTER: 1n << 12n,
	ROLE_UNREGISTER_ADMIN: admin(1n << 12n),
	ROLE_RENEW: 1n << 16n,
	ROLE_RENEW_ADMIN: admin(1n << 16n),
	ROLE_SET_SUBREGISTRY: 1n << 20n,
	ROLE_SET_SUBREGISTRY_ADMIN: admin(1n << 20n),
	ROLE_SET_RESOLVER: 1n << 24n,
	ROLE_SET_RESOLVER_ADMIN: admin(1n << 24n),
	ROLE_CAN_TRANSFER_ADMIN: admin(1n << 28n),
	ROLE_WAS_RESERVED: 1n << 32n,
	ROLE_SET_URI: 1n << 36n,
	ROLE_SET_URI_ADMIN: admin(1n << 36n),
	ROLE_CAN_NAME: 1n << 120n,
	ROLE_CAN_NAME_ADMIN: admin(1n << 120n),
	ROLE_UPGRADE: 1n << 124n,
	ROLE_UPGRADE_ADMIN: admin(1n << 124n),
} as const;

export const resolverRoles = {
	ROLE_SET_ADDRESS: 1n << 0n,
	ROLE_SET_ADDRESS_ADMIN: admin(1n << 0n),
	ROLE_SET_TEXT: 1n << 4n,
	ROLE_SET_TEXT_ADMIN: admin(1n << 4n),
	ROLE_SET_CONTENTHASH: 1n << 8n,
	ROLE_SET_CONTENTHASH_ADMIN: admin(1n << 8n),
	ROLE_SET_ABI: 1n << 12n,
	ROLE_SET_ABI_ADMIN: admin(1n << 12n),
	ROLE_SET_INTERFACE: 1n << 16n,
	ROLE_SET_INTERFACE_ADMIN: admin(1n << 16n),
	ROLE_SET_NAME: 1n << 20n,
	ROLE_SET_NAME_ADMIN: admin(1n << 20n),
	ROLE_SET_DATA: 1n << 24n,
	ROLE_SET_DATA_ADMIN: admin(1n << 24n),
	ROLE_LINK: 1n << 28n,
	ROLE_LINK_ADMIN: admin(1n << 28n),
	ROLE_CAN_NAME: 1n << 120n,
	ROLE_CAN_NAME_ADMIN: admin(1n << 120n),
	ROLE_UPGRADE: 1n << 124n,
	ROLE_UPGRADE_ADMIN: admin(1n << 124n),
} as const;

export const releaseResolverRootRoles =
	resolverRoles.ROLE_SET_ADDRESS |
	resolverRoles.ROLE_SET_TEXT |
	resolverRoles.ROLE_SET_CONTENTHASH;

export function textResource(key: string): bigint {
	return BigInt(keccak256(toBytes(key)));
}

export function coinTypeResource(coinType: bigint | number): bigint {
	return BigInt(
		keccak256(encodeAbiParameters([{ type: "uint256" }], [BigInt(coinType)])),
	);
}

export function interfaceResource(interfaceId: Hex): bigint {
	return BigInt(keccak256(interfaceId));
}

export const defaultCoinType = 0x80000000n;

export function nybbleCount(counts: bigint, role: bigint): number {
	let shift = 0n;
	while (role > 1n) {
		role >>= 1n;
		shift++;
	}
	return Number((counts >> shift) & 0xfn);
}

export function hasRole(bitmap: bigint, role: bigint): boolean {
	return (bitmap & role) === role;
}

export const roleHex = (bitmap: bigint): Hex => toHex(bitmap, { size: 32 });
