import {
	type Address,
	BaseError,
	ContractFunctionRevertedError,
	ContractFunctionZeroDataError,
	decodeFunctionResult,
	encodeFunctionData,
	type Hex,
	isAddressEqual,
	keccak256,
	namehash,
	zeroAddress,
} from "viem";
import {
	erc1967ImplementationSlot,
	permissionedResolverAbi,
	resolverProfileAbi,
	userRegistryAbi,
	verifiableFactoryAbi,
} from "../ens/abi";
import type { EnsClient } from "../ens/client";
import { findResolver, readAddr, resolveViaUniversal } from "../ens/resolve";
import type { CheckDeps } from "./types";

export type Ctx = {
	ens: EnsClient;
	deps: CheckDeps;
	block: bigint;
	timestamp: bigint;
	chunk: bigint;
	depth: bigint;
	memo: Map<string, Promise<unknown>>;
};

export function memo<T>(ctx: Ctx, key: string, run: () => Promise<T>) {
	const hit = ctx.memo.get(key);
	if (hit) return hit as Promise<T>;
	const fresh = run();
	ctx.memo.set(key, fresh);
	return fresh;
}

export function isRevert(err: unknown): boolean {
	return (
		err instanceof BaseError &&
		err.walk(
			(e) =>
				e instanceof ContractFunctionRevertedError ||
				e instanceof ContractFunctionZeroDataError,
		) !== null
	);
}

export function sameAddress(a: string | undefined, b: string | undefined) {
	if (!a || !b) return false;
	return isAddressEqual(a as Address, b as Address);
}

export function isZero(a: Address) {
	return isAddressEqual(a, zeroAddress);
}

function registryRead<T>(
	ctx: Ctx,
	address: Address,
	functionName: string,
	args: readonly unknown[],
): Promise<T> {
	return ctx.ens.publicClient.readContract({
		address,
		abi: userRegistryAbi,
		functionName,
		args,
		blockNumber: ctx.block,
	} as never) as Promise<T>;
}

function resolverRead<T>(
	ctx: Ctx,
	address: Address,
	functionName: string,
	args: readonly unknown[],
): Promise<T> {
	return ctx.ens.publicClient.readContract({
		address,
		abi: permissionedResolverAbi,
		functionName,
		args,
		blockNumber: ctx.block,
	} as never) as Promise<T>;
}

export const registry = {
	subregistry: (ctx: Ctx, reg: Address, label: string) =>
		memo(ctx, `sub:${reg}:${label}`, () =>
			registryRead<Address>(ctx, reg, "getSubregistry", [label]),
		),
	resolver: (ctx: Ctx, reg: Address, label: string) =>
		memo(ctx, `res:${reg}:${label}`, () =>
			registryRead<Address>(ctx, reg, "getResolver", [label]),
		),
	owner: (ctx: Ctx, reg: Address, id: bigint) =>
		registryRead<Address>(ctx, reg, "getOwner", [id]),
	tokenId: (ctx: Ctx, reg: Address, id: bigint) =>
		registryRead<bigint>(ctx, reg, "getTokenId", [id]),
	roleCount: (ctx: Ctx, reg: Address, id: bigint) =>
		registryRead<bigint>(ctx, reg, "roleCount", [id]),
	roles: (ctx: Ctx, reg: Address, id: bigint, account: Address) =>
		registryRead<bigint>(ctx, reg, "roles", [id, account]),
	hasRootRoles: (ctx: Ctx, reg: Address, bitmap: bigint, account: Address) =>
		memo(ctx, `hrr:${reg}:${bitmap}:${account.toLowerCase()}`, () =>
			registryRead<boolean>(ctx, reg, "hasRootRoles", [bitmap, account]),
		),
};

export const resolver = {
	roleCount: (ctx: Ctx, res: Address, resource: bigint) =>
		resolverRead<bigint>(ctx, res, "roleCount", [resource]),
	roles: (ctx: Ctx, res: Address, resource: bigint, account: Address) =>
		resolverRead<bigint>(ctx, res, "roles", [resource, account]),
};

export async function factoryImplementation(
	ctx: Ctx,
	proxy: Address,
): Promise<Address | undefined> {
	try {
		return await ctx.ens.publicClient.readContract({
			address: ctx.ens.deployment.verifiableFactory,
			abi: verifiableFactoryAbi,
			functionName: "verifyContract",
			args: [proxy],
			blockNumber: ctx.block,
		});
	} catch (err) {
		if (isRevert(err)) return undefined;
		throw err;
	}
}

export function lookupResolver(ctx: Ctx, name: string) {
	return memo(ctx, `find:${name}`, () =>
		findResolver(ctx.ens, name, ctx.block),
	);
}

async function universal<T>(
	ctx: Ctx,
	name: string,
	call:
		| { functionName: "text"; args: [Hex, string] }
		| { functionName: "addr"; args: [Hex, bigint] },
): Promise<{ value: T; resolver: Address }> {
	const data = encodeFunctionData({ abi: resolverProfileAbi, ...call });
	const { result, resolver } = await resolveViaUniversal(
		ctx.ens,
		name,
		data,
		ctx.block,
	);
	const value = decodeFunctionResult({
		abi: resolverProfileAbi,
		functionName: call.functionName,
		data: result,
	}) as T;
	return { value, resolver };
}

export function textViaUniversal(ctx: Ctx, name: string, key: string) {
	return universal<string>(ctx, name, {
		functionName: "text",
		args: [namehash(name), key],
	});
}

export function addrViaUniversal(ctx: Ctx, name: string, coinType: bigint) {
	return universal<Hex>(ctx, name, {
		functionName: "addr",
		args: [namehash(name), coinType],
	});
}

export async function directAddr(
	ctx: Ctx,
	res: Address,
	name: string,
	coinType: bigint,
): Promise<Hex | undefined> {
	try {
		return await readAddr(ctx.ens, res, name, coinType, ctx.block);
	} catch (err) {
		if (isRevert(err)) return undefined;
		throw err;
	}
}

export type CodeInfo = { hash: Hex; empty: boolean; delegated: boolean };

export async function codeInfo(ctx: Ctx, address: Address): Promise<CodeInfo> {
	const code =
		(await ctx.ens.publicClient.getCode({ address, blockNumber: ctx.block })) ??
		"0x";
	return {
		hash: keccak256(code),
		empty: code === "0x",
		delegated: code.toLowerCase().startsWith("0xef0100"),
	};
}

export const erc1967BeaconSlot =
	"0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50" as const;

export async function slotAddress(
	ctx: Ctx,
	address: Address,
	slot: Hex,
): Promise<Address | undefined> {
	const word = await ctx.ens.publicClient.getStorageAt({
		address,
		slot,
		blockNumber: ctx.block,
	});
	if (!word || BigInt(word) === 0n) return undefined;
	return `0x${word.slice(-40)}` as Address;
}

export function implementationSlot(ctx: Ctx, address: Address) {
	return slotAddress(ctx, address, erc1967ImplementationSlot);
}

export function blockTimestamp(ctx: Ctx, blockNumber: bigint) {
	return memo(ctx, `ts:${blockNumber}`, async () => {
		const b = await ctx.ens.publicClient.getBlock({ blockNumber });
		return b.timestamp;
	});
}
