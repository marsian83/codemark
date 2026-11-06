import Safe from "@safe-global/protocol-kit";
import { type Address, getAddress, type Hex } from "viem";
import type { CliContext } from "../lib/context";
import type { BatchCall, RootExecutor } from "../lib/root";
import { confirm } from "../lib/tx";

export async function safeRoot(
	ctx: CliContext,
	rpcUrl: string,
	ownerKey: Hex,
	safeAddress: Address,
): Promise<RootExecutor> {
	const safe = await Safe.init({
		provider: rpcUrl,
		signer: ownerKey,
		safeAddress,
	});
	return {
		address: getAddress(safeAddress),
		async execute(calls: BatchCall[]) {
			const tx = await safe.createTransaction({
				transactions: calls.map((c) => ({
					to: c.to,
					data: c.data,
					value: (c.value ?? 0n).toString(),
				})),
				onlyCalls: true,
			});
			const result = await safe.executeTransaction(tx);
			const sent = await confirm(ctx, result.hash as Hex);
			const failure = sent.receipt.logs.find(
				(log) =>
					log.address.toLowerCase() === safeAddress.toLowerCase() &&
					log.topics[0] === executionFailureTopic,
			);
			if (failure) throw new Error(`Safe transaction ${sent.hash} failed`);
			return sent;
		},
	};
}

const executionFailureTopic =
	"0x23428b18acfb3ea64b08dc0c1d296ea9c09702c09083ca5272e64d115b687d23";
