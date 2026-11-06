import { createArkivReader } from "@codemark/shared/arkiv/client";
import { sepolia as deployment } from "@codemark/shared/ens/addresses";
import {
	type EnsClient,
	failoverTransport,
	sepoliaRpcUrls,
} from "@codemark/shared/ens/client";
import { createPublicClient, type PublicClient } from "viem";
import { sepolia as chain } from "viem/chains";
import { config } from "./config";

export function rpcOrder(keyed: string | undefined) {
	return [...new Set(keyed ? [keyed, ...sepoliaRpcUrls] : sepoliaRpcUrls)];
}

export function createEns(urls: string[]): EnsClient {
	const publicClient = createPublicClient({
		chain,
		batch: { multicall: { wait: 16 } },
		transport: failoverTransport(urls),
	}) as PublicClient;
	return { chain, publicClient, deployment };
}

export const ens = createEns(rpcOrder(config.sepoliaRpc));
export const arkivReader = createArkivReader(config.arkivAccessKey);
