import { createPublicClient } from "@arkiv-network/sdk";
import { rabdi } from "@arkiv-network/sdk/chains";
import { failoverTransport } from "../ens/client";

export function createArkivReader(accessKey = "") {
	const urls = [accessKey, ""].flatMap(
		(key) => rabdi({ accessKey: key }).rpcUrls.default.http,
	);
	return createPublicClient({
		chain: rabdi({ accessKey }),
		transport: failoverTransport([...new Set(urls)]),
	});
}

export type ArkivReader = ReturnType<typeof createArkivReader>;
