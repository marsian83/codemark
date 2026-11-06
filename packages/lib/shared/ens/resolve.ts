import {
	type Address,
	decodeFunctionResult,
	encodeFunctionData,
	type Hex,
	namehash,
	toHex,
	zeroAddress,
} from "viem";
import { packetToBytes } from "viem/ens";
import {
	registryAbi,
	resolverAbi,
	resolverProfileAbi,
	universalResolverAbi,
} from "./abi";
import type { EnsClient } from "./client";
import { liveRootRegistry } from "./deployment";

export type ResolverLookup = {
	resolver: Address;
	node: Hex;
	offset: bigint;
	inherited: boolean;
};

export function dnsEncode(name: string): Hex {
	return toHex(packetToBytes(name));
}

export async function findResolver(
	ens: EnsClient,
	name: string,
	blockNumber?: bigint,
): Promise<ResolverLookup> {
	const [resolver, node, offset] = await ens.publicClient.readContract({
		address: ens.deployment.universalResolver,
		abi: universalResolverAbi,
		functionName: "findResolver",
		args: [dnsEncode(name)],
		blockNumber,
	});
	return { resolver, node, offset, inherited: offset !== 0n };
}

async function resolveOn(
	ens: EnsClient,
	resolver: Address,
	name: string,
	data: Hex,
	blockNumber?: bigint,
): Promise<Hex> {
	return ens.publicClient.readContract({
		address: resolver,
		abi: resolverAbi,
		functionName: "resolve",
		args: [dnsEncode(name), data],
		blockNumber,
	});
}

export async function readText(
	ens: EnsClient,
	resolver: Address,
	name: string,
	key: string,
	blockNumber?: bigint,
): Promise<string> {
	const data = encodeFunctionData({
		abi: resolverProfileAbi,
		functionName: "text",
		args: [namehash(name), key],
	});
	const result = await resolveOn(ens, resolver, name, data, blockNumber);
	return decodeFunctionResult({
		abi: resolverProfileAbi,
		functionName: "text",
		data: result,
	});
}

export async function readAddr(
	ens: EnsClient,
	resolver: Address,
	name: string,
	coinType: number | bigint,
	blockNumber?: bigint,
): Promise<Hex> {
	const data = encodeFunctionData({
		abi: resolverProfileAbi,
		functionName: "addr",
		args: [namehash(name), BigInt(coinType)],
	});
	const result = await resolveOn(ens, resolver, name, data, blockNumber);
	return decodeFunctionResult({
		abi: resolverProfileAbi,
		functionName: "addr",
		data: result,
	});
}

export async function readContenthash(
	ens: EnsClient,
	resolver: Address,
	name: string,
	blockNumber?: bigint,
): Promise<Hex> {
	const data = encodeFunctionData({
		abi: resolverProfileAbi,
		functionName: "contenthash",
		args: [namehash(name)],
	});
	const result = await resolveOn(ens, resolver, name, data, blockNumber);
	return decodeFunctionResult({
		abi: resolverProfileAbi,
		functionName: "contenthash",
		data: result,
	});
}

export async function resolveViaUniversal(
	ens: EnsClient,
	name: string,
	data: Hex,
	blockNumber?: bigint,
): Promise<{ result: Hex; resolver: Address }> {
	const [result, resolver] = await ens.publicClient.readContract({
		address: ens.deployment.universalResolver,
		abi: universalResolverAbi,
		functionName: "resolve",
		args: [dnsEncode(name), data],
		blockNumber,
	});
	return { result, resolver };
}

export async function walkRegistries(
	ens: EnsClient,
	name: string,
	blockNumber?: bigint,
): Promise<Address[]> {
	const labels = name.split(".").reverse();
	const root = await liveRootRegistry(ens, blockNumber);
	const path: Address[] = [root];
	let current: Address = root;
	for (const label of labels) {
		const next = await ens.publicClient.readContract({
			address: current,
			abi: registryAbi,
			functionName: "getSubregistry",
			args: [label],
			blockNumber,
		});
		if (next === zeroAddress) break;
		path.push(next);
		current = next;
	}
	return path;
}
