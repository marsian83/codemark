import { createPublicClient } from "@arkiv-network/sdk";
import { rabdi } from "@arkiv-network/sdk/chains";
import { http } from "viem";

export function createArkivReader(accessKey = "") {
	return createPublicClient({ chain: rabdi({ accessKey }), transport: http() });
}

export type ArkivReader = ReturnType<typeof createArkivReader>;
