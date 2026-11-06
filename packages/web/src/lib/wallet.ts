import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { config } from "./config";

const chain = {
	...sepolia,
	rpcUrls: { default: { http: [config.anvilRpc] } },
};

export const account = privateKeyToAccount(
	config.anvilAccountKey as `0x${string}`,
);

export const forkPublic = createPublicClient({
	chain,
	transport: http(config.anvilRpc, { retryCount: 0, timeout: 4000 }),
});

export const forkWallet = createWalletClient({
	account,
	chain,
	transport: http(config.anvilRpc),
});

export async function readForkState() {
	const [block, code] = await Promise.all([
		forkPublic.getBlock({ blockTag: "latest" }),
		forkPublic.getCode({ address: account.address }),
	]);
	const delegate =
		code?.startsWith("0xef0100") && code.length === 48
			? (`0x${code.slice(8)}` as `0x${string}`)
			: undefined;
	return {
		blockNumber: block.number,
		timestamp: Number(block.timestamp),
		delegate,
	};
}

export async function upgradeAccount(contractAddress: `0x${string}`) {
	const authorization = await forkWallet.signAuthorization({
		contractAddress,
		executor: "self",
	});
	const hash = await forkWallet.sendTransaction({
		authorizationList: [authorization],
		to: account.address,
		data: "0x",
	});
	await forkPublic.waitForTransactionReceipt({ hash });
	return hash;
}
