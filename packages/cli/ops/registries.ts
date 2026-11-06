import { userRegistryAbi } from "@codemark/shared/ens/abi";
import { walkRegistries } from "@codemark/shared/ens/resolve";
import { labelId } from "@codemark/shared/names";
import type { Address } from "viem";
import type { CliContext } from "../lib/context";

export async function registryOf(
	ctx: CliContext,
	name: string,
): Promise<Address> {
	const path = await walkRegistries(ctx.ens, name);
	if (path.length !== name.split(".").length + 1)
		throw new Error(`${name} has no registry`);
	return path[path.length - 1] as Address;
}

export async function parentRegistry(
	ctx: CliContext,
	name: string,
): Promise<Address> {
	return registryOf(ctx, name.split(".").slice(1).join("."));
}

export async function ownerOf(
	ctx: CliContext,
	registry: Address,
	label: string,
): Promise<Address> {
	return ctx.ens.publicClient.readContract({
		address: registry,
		abi: userRegistryAbi,
		functionName: "getOwner",
		args: [labelId(label)],
	});
}

export async function tokenIdOf(
	ctx: CliContext,
	registry: Address,
	label: string,
): Promise<bigint> {
	return ctx.ens.publicClient.readContract({
		address: registry,
		abi: userRegistryAbi,
		functionName: "getTokenId",
		args: [labelId(label)],
	});
}

export async function expiryOf(
	ctx: CliContext,
	registry: Address,
	label: string,
): Promise<bigint> {
	return ctx.ens.publicClient.readContract({
		address: registry,
		abi: userRegistryAbi,
		functionName: "getExpiry",
		args: [labelId(label)],
	});
}

export async function publisherRoot(
	ctx: CliContext,
	publisher: string,
): Promise<Address> {
	const [label] = publisher.split(".");
	const parent = await parentRegistry(ctx, publisher);
	return ownerOf(ctx, parent, label as string);
}

export async function now(ctx: CliContext): Promise<bigint> {
	const block = await ctx.ens.publicClient.getBlock();
	return block.timestamp;
}
