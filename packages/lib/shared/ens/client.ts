import {
	type Chain,
	createPublicClient,
	fallback,
	http,
	type PublicClient,
} from "viem";
import { sepolia as sepoliaChain } from "viem/chains";
import { sepolia } from "./addresses";

export type EnsClient = {
	chain: Chain;
	publicClient: PublicClient;
	deployment: typeof sepolia;
};

export const sepoliaRpcUrls = [
	"https://ethereum-sepolia-rpc.publicnode.com",
	"https://sepolia.gateway.tenderly.co",
];

function defaultTransport() {
	return fallback(
		sepoliaRpcUrls.map((url) => http(url, { timeout: 8000, retryCount: 1 })),
	);
}

export function createEnsClient(
	rpcUrl?: string,
	options: { pollingInterval?: number } = {},
): EnsClient {
	const publicClient = createPublicClient({
		chain: sepoliaChain,
		transport: rpcUrl ? http(rpcUrl) : defaultTransport(),
		pollingInterval: options.pollingInterval,
	}) as PublicClient;
	return { chain: sepoliaChain, publicClient, deployment: sepolia };
}
