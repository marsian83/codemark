import { type Address, isAddressEqual } from "viem";
import { universalResolverAbi } from "./abi";
import type { EnsClient } from "./client";

export async function liveRootRegistry(
	ens: EnsClient,
	blockNumber?: bigint,
): Promise<Address> {
	const root = await ens.publicClient.readContract({
		address: ens.deployment.universalResolver,
		abi: universalResolverAbi,
		functionName: "ROOT_REGISTRY",
		blockNumber,
	});
	if (!isAddressEqual(root, ens.deployment.rootRegistry)) {
		throw new Error(
			`ENS deployment changed: the Universal Resolver reads root registry ${root}, Codemark is configured for ${ens.deployment.rootRegistry}`,
		);
	}
	return root;
}
