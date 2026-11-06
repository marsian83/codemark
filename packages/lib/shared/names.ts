import {
	type Address,
	type Hex,
	keccak256,
	labelhash,
	namehash,
	toHex,
} from "viem";
import { normalize } from "viem/ens";

export type ArtifactId =
	| `eip155:${number}:${Lowercase<Address>}`
	| `ipfs:${string}`;

export function contractArtifact(
	chainId: number,
	address: Address,
): ArtifactId {
	return `eip155:${chainId}:${address.toLowerCase() as Lowercase<Address>}`;
}

export function ipfsArtifact(cid: string): ArtifactId {
	return `ipfs:${cid}`;
}

export function forwardLabel(artifact: ArtifactId): string {
	const digest = keccak256(toHex(artifact));
	return `a-${digest.slice(2, 14)}`;
}

export function normalizeName(input: string): string {
	const trimmed = input.trim();
	let normalized: string;
	try {
		normalized = normalize(trimmed);
	} catch (error) {
		const reason = error instanceof Error ? error.message.split("\n")[0] : "";
		throw new Error(
			`not a valid ENS name: ${JSON.stringify(input)} (${reason})`,
		);
	}
	if (normalized === "" || normalized.split(".").some((l) => l === ""))
		throw new Error(`not a valid ENS name: ${JSON.stringify(input)}`);
	return normalized;
}

export function normalizeLabel(input: string): string {
	const label = normalizeName(input);
	if (label.includes("."))
		throw new Error(`expected a single label, got ${JSON.stringify(input)}`);
	return label;
}

export function isNormalized(name: string): boolean {
	try {
		return normalizeName(name) === name;
	} catch {
		return false;
	}
}

export function releaseName(
	publisher: string,
	key: string,
	label: string,
): string {
	return normalizeName(`${label}.${key}.${publisher}`);
}

export function labelId(label: string): bigint {
	return BigInt(labelhash(label));
}

export function node(name: string): Hex {
	return namehash(name);
}

const labelPattern = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;

export function isValidLabel(label: string): boolean {
	return labelPattern.test(label) && isNormalized(label);
}
