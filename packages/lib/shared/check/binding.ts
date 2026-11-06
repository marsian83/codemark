import { type Address, type Hex, isAddressEqual, labelhash } from "viem";
import { type ArtifactId, forwardLabel, isValidLabel } from "../names";
import type { ReleaseRecord } from "../record";

const semver = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

export function versionLabel(component: string, version: string) {
	const m = semver.exec(version);
	if (!m) return undefined;
	const label = `${component}-${m[1]}-${m[2]}-${m[3]}`;
	return isValidLabel(label) ? label : undefined;
}

export type SplitName = { label: string; key: string; publisher: string };

export function splitReleaseName(name: string): SplitName | undefined {
	const parts = name.split(".");
	if (parts.length < 4) return undefined;
	const [label, key, ...rest] = parts as [string, string, ...string[]];
	if (!isValidLabel(label) || !isValidLabel(key)) return undefined;
	if (!rest.every(isValidLabel)) return undefined;
	return { label, key, publisher: rest.join(".") };
}

export function bindsName(
	name: string,
	expected: { key: string; publisher: string },
): SplitName | undefined {
	const split = splitReleaseName(name);
	if (!split) return undefined;
	if (split.key !== expected.key || split.publisher !== expected.publisher)
		return undefined;
	return split;
}

export function labelMatchesRecord(
	label: string,
	record: ReleaseRecord,
	artifact: ArtifactId,
): boolean {
	return (
		label === forwardLabel(artifact) ||
		label === versionLabel(record.component, record.version)
	);
}

export function addressFromAddrRecord(bytes: Hex): Address | undefined {
	if (bytes.length !== 42) return undefined;
	return bytes as Address;
}

export type RecordProblem = string | undefined;

export function recordProblem(
	record: ReleaseRecord,
	target: { address: Address; chainId: number; role: string },
	addrRecord: Hex,
): RecordProblem {
	const addr = addressFromAddrRecord(addrRecord);
	if (!addr || !isAddressEqual(addr, target.address))
		return "the name's address record is a different address";
	if (record.chainId !== target.chainId)
		return `the record is for chain ${record.chainId}`;
	if (record.kind === "web")
		return "the name is a frontend build, not a contract";
	if (
		(target.role === "delegation" || target.role === "delegatecall") &&
		record.kind !== "delegate"
	)
		return `a ${target.role} target must be published as a delegate (root only)`;
	if (!record.codehash) return "the record has no code hash";
	return undefined;
}

export function codeProblem(
	record: ReleaseRecord,
	actual: {
		empty?: boolean;
		delegated?: boolean;
		beacon?: Address;
		codeHash: Hex;
		implementation?: Address;
		implementationCodeHash?: Hex;
	},
): RecordProblem {
	if (actual.empty) return "the address has no code";
	if (actual.delegated)
		return "the address is an EIP-7702 delegated account, whose code can change";
	if (actual.beacon) return "beacon proxies are not attested";
	if (record.codehash !== actual.codeHash.toLowerCase())
		return "the deployed code differs from the published code hash";
	if (!actual.implementation && !record.implementation) return undefined;
	if (!actual.implementation || !record.implementation)
		return "the proxy implementation does not match the release";
	if (!isAddressEqual(actual.implementation, record.implementation as Address))
		return "the proxy now points at a different implementation";
	if (
		!record.implementationCodehash ||
		record.implementationCodehash !==
			actual.implementationCodeHash?.toLowerCase()
	)
		return "the implementation code differs from the published hash";
	return undefined;
}

export function sameLabel(tokenId: bigint, label: string): boolean {
	return tokenId >> 32n === BigInt(labelhash(label)) >> 32n;
}
