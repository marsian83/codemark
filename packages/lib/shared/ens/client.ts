import {
	type Chain,
	createPublicClient,
	custom,
	HttpRequestError,
	http,
	type PublicClient,
	shouldThrow,
	TimeoutError,
	type Transport,
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
	"https://0xrpc.io/sep",
	"https://rpc.sentio.xyz/sepolia",
];

type FailoverOptions = { timeoutMs?: number; restMs?: number };

function isOutage(error: unknown) {
	return error instanceof HttpRequestError || error instanceof TimeoutError;
}

export function failoverTransport(
	urls: string[],
	{ timeoutMs = 8000, restMs = 30_000 }: FailoverOptions = {},
): Transport {
	return (config) => {
		const rpcs = urls.map((url) => ({
			request: http(url, { timeout: timeoutMs, retryCount: 0 })({
				...config,
				retryCount: 0,
			}).request,
			restingUntil: 0,
		}));
		return custom(
			{
				async request({ method, params }) {
					const now = Date.now();
					const order = [
						...rpcs.filter((rpc) => rpc.restingUntil <= now),
						...rpcs.filter((rpc) => rpc.restingUntil > now),
					];
					let failure: unknown;
					for (const rpc of order) {
						try {
							const result = await rpc.request({ method, params });
							rpc.restingUntil = 0;
							return result;
						} catch (error) {
							if (shouldThrow(error as Error)) throw error;
							if (isOutage(error)) rpc.restingUntil = Date.now() + restMs;
							failure = error;
						}
					}
					throw failure;
				},
			},
			{ retryCount: 0 },
		)(config);
	};
}

export function createEnsClient(
	rpcUrl?: string,
	options: { pollingInterval?: number } = {},
): EnsClient {
	const publicClient = createPublicClient({
		chain: sepoliaChain,
		transport: rpcUrl ? http(rpcUrl) : failoverTransport(sepoliaRpcUrls),
		pollingInterval: options.pollingInterval,
	}) as PublicClient;
	return { chain: sepoliaChain, publicClient, deployment: sepolia };
}
