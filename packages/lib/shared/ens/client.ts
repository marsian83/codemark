import { type Chain, createPublicClient, http, type PublicClient } from "viem";
import { sepolia as sepoliaChain } from "viem/chains";
import { sepolia } from "./addresses";

export type EnsClient = {
	chain: Chain;
	publicClient: PublicClient;
	deployment: typeof sepolia;
};

export function createEnsClient(
	rpcUrl?: string,
	options: { pollingInterval?: number } = {},
): EnsClient {
	const publicClient = createPublicClient({
		chain: sepoliaChain,
		transport: http(rpcUrl),
		pollingInterval: options.pollingInterval,
	});
	return { chain: sepoliaChain, publicClient, deployment: sepolia };
}
