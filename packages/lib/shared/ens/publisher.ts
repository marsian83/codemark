import type { Address } from "viem";
import { normalizeName } from "../names";
import type { EnsClient } from "./client";
import { walkRegistries } from "./resolve";

export function parsePublisherName(input: unknown): string {
	if (typeof input !== "string") throw new Error("name must be a string");
	const name = normalizeName(input);
	if (name.split(".").length < 2)
		throw new Error(`Not a valid ENS name: ${input}`);
	return name;
}

export async function resolvePubRegistry(
	ens: EnsClient,
	name: string,
	blockNumber?: bigint,
): Promise<Address> {
	const labels = name.split(".");
	const path = await walkRegistries(ens, name, blockNumber);
	if (path.length !== labels.length + 1) {
		throw new Error(`${name} has no registry in the ENSv2 tree`);
	}
	return path[path.length - 1] as Address;
}
