import { sepolia } from "@codemark/shared/ens/addresses";
import type { EnsClient } from "@codemark/shared/ens/client";
import { createPublicClient, fallback, http, type PublicClient } from "viem";
import { sepolia as sepoliaChain } from "viem/chains";

export const sepoliaRpcUrls = [
	"https://sepolia.gateway.tenderly.co",
	"https://ethereum-sepolia-rpc.publicnode.com",
	"https://sepolia.drpc.org",
];

export function createSnapEnsClient(): EnsClient {
	const publicClient = createPublicClient({
		chain: sepoliaChain,
		transport: fallback(
			sepoliaRpcUrls.map((url) => http(url, { timeout: 8000, retryCount: 1 })),
		),
	}) as PublicClient;
	return { chain: sepoliaChain, publicClient, deployment: sepolia };
}
