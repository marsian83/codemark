import type { Hex } from "viem";
import { type ArkivWriter, createArkivWriter } from "../arkiv/writer";

export function createArkivWriters(
	accessKey: string,
	keys: { ci?: string; sec?: string },
): { release?: ArkivWriter; incident?: ArkivWriter } | undefined {
	if (!accessKey) return undefined;
	return {
		release: keys.ci ? createArkivWriter(keys.ci as Hex, accessKey) : undefined,
		incident: keys.sec
			? createArkivWriter(keys.sec as Hex, accessKey)
			: undefined,
	};
}
