import type {
	Abi,
	Address,
	ContractFunctionArgs,
	ContractFunctionName,
	Hex,
	TransactionReceipt,
} from "viem";
import type { CliContext } from "./context";
import type { Signer } from "./signers";

export type Sent = { hash: Hex; block: bigint; receipt: TransactionReceipt };

export async function send<
	const abi extends Abi,
	name extends ContractFunctionName<abi, "nonpayable" | "payable">,
	args extends ContractFunctionArgs<abi, "nonpayable" | "payable", name>,
>(
	ctx: CliContext,
	signer: Signer,
	call: { address: Address; abi: abi; functionName: name; args: args },
): Promise<Sent> {
	const params = { ...(call as object), account: signer.account } as never;
	const { request } = await ctx.ens.publicClient.simulateContract(params);
	const hash = await signer.writeContract(request as never);
	return confirm(ctx, hash);
}

export async function confirm(ctx: CliContext, hash: Hex): Promise<Sent> {
	const interval = ctx.ens.publicClient.pollingInterval;
	const deadline = Date.now() + 180_000;
	while (Date.now() < deadline) {
		const receipt = await ctx.ens.publicClient
			.getTransactionReceipt({ hash })
			.catch(() => undefined);
		if (receipt) {
			if (receipt.status !== "success")
				throw new Error(`transaction ${hash} reverted`);
			return { hash, block: receipt.blockNumber, receipt };
		}
		await Bun.sleep(interval);
	}
	throw new Error(`transaction ${hash} not mined after 180 s`);
}

export async function sendTogether(
	ctx: CliContext,
	signer: Signer,
	calls: {
		address: Address;
		abi: Abi;
		functionName: string;
		args: readonly unknown[];
	}[],
): Promise<Sent[]> {
	const requests: unknown[] = [];
	for (const call of calls) {
		const params = { ...call, account: signer.account } as never;
		requests.push(
			(await ctx.ens.publicClient.simulateContract(params)).request,
		);
	}
	const submit = async () => {
		const hashes: Hex[] = [];
		let nonce = await ctx.ens.publicClient.getTransactionCount({
			address: signer.account.address,
			blockTag: "pending",
		});
		for (const request of requests) {
			hashes.push(
				await signer.writeContract({ ...(request as object), nonce } as never),
			);
			nonce++;
		}
		return hashes;
	};
	const hashes = ctx.sameBlock ? await ctx.sameBlock(submit) : await submit();
	const sent: Sent[] = [];
	for (const hash of hashes) sent.push(await confirm(ctx, hash));
	return sent;
}
