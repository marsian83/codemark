import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { config } from "./config";
import { ens } from "./rpc";

export const account = privateKeyToAccount(generatePrivateKey());

export async function readChainHead() {
	const block = await ens.publicClient.getBlock({
		blockTag: "latest",
	});
	return { blockNumber: block.number, timestamp: Number(block.timestamp) };
}

export function signUpgrade(contractAddress: `0x${string}`) {
	return account.signAuthorization({
		address: contractAddress,
		chainId: config.chainId,
		nonce: 0,
	});
}
