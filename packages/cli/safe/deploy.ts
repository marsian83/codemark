import Safe from "@safe-global/protocol-kit";
import { type Address, getAddress, type Hex, keccak256, toHex } from "viem";
import type { CliContext } from "../lib/context";
import type { Signer } from "../lib/signers";
import { confirm } from "../lib/tx";

export type DeployedSafe = {
	address: Address;
	fallbackHandler: Address;
	hash?: Hex;
};

export async function deploySafe(
	ctx: CliContext,
	rpcUrl: string,
	ownerKey: Hex,
	owner: Signer,
	saltNonce = rootSafeSalt(owner.account.address),
): Promise<DeployedSafe> {
	const predicted = await Safe.init({
		provider: rpcUrl,
		signer: ownerKey,
		predictedSafe: {
			safeAccountConfig: { owners: [owner.account.address], threshold: 1 },
			safeDeploymentConfig: { saltNonce, safeVersion: "1.4.1" },
		},
	});
	const address = getAddress(await predicted.getAddress());
	let hash: Hex | undefined;
	if (!(await predicted.isSafeDeployed())) {
		const tx = await predicted.createSafeDeploymentTransaction();
		hash = await owner.sendTransaction({
			to: tx.to as Address,
			data: tx.data as Hex,
			value: BigInt(tx.value),
		});
		await confirm(ctx, hash);
	}
	const deployed = await predicted.connect({ safeAddress: address });
	const fallbackHandler = getAddress(await deployed.getFallbackHandler());
	ctx.log(`root Safe ${address} (fallback handler ${fallbackHandler})`);
	return { address, fallbackHandler, hash };
}

export function rootSafeSalt(owner: Address): string {
	return BigInt(
		keccak256(toHex(`codemark-root:${owner.toLowerCase()}`)),
	).toString();
}
