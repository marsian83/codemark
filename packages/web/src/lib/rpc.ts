import { createPublicClient as createArkivClient } from "@arkiv-network/sdk";
import { rabdi } from "@arkiv-network/sdk/chains";
import type { ArkivReader } from "@codemark/shared/arkiv/client";
import { sepolia as deployment } from "@codemark/shared/ens/addresses";
import type { EnsClient } from "@codemark/shared/ens/client";
import { createPublicClient, fallback, http, type PublicClient } from "viem";
import { sepolia as chain } from "viem/chains";
import { config } from "./config";

export const publicSepoliaRpcs = [
	"https://ethereum-sepolia-rpc.publicnode.com",
	"https://sepolia.gateway.tenderly.co",
	"https://0xrpc.io/sep",
	"https://rpc.sentio.xyz/sepolia",
];

const rpcOptions = { timeout: 8000, retryCount: 1 };

export function rpcOrder(
	keyed: string | undefined,
	publicRpcs: string[] = publicSepoliaRpcs,
	random: () => number = Math.random,
) {
	const shuffled = publicRpcs
		.map((url) => ({ url, rank: random() }))
		.sort((a, b) => a.rank - b.rank)
		.map(({ url }) => url);
	return [...new Set(keyed ? [keyed, ...shuffled] : shuffled)];
}

export function createEns(urls: string[]): EnsClient {
	const publicClient = createPublicClient({
		chain,
		batch: { multicall: { wait: 16 } },
		transport: fallback(urls.map((url) => http(url, rpcOptions))),
	}) as PublicClient;
	return { chain, publicClient, deployment };
}

export function createArkiv(accessKey: string): ArkivReader {
	const urls = [accessKey, ""].flatMap(
		(key) => rabdi({ accessKey: key }).rpcUrls.default.http,
	);
	return createArkivClient({
		chain: rabdi({ accessKey }),
		transport: fallback([...new Set(urls)].map((url) => http(url, rpcOptions))),
	}) as unknown as ArkivReader;
}

export const ens = createEns(rpcOrder(config.sepoliaRpc));
export const arkivReader = createArkiv(config.arkivAccessKey);
