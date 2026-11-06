import type { Address, Hex } from "viem";
import type { Target } from "../check/types";
import { add, collectCall, newCollector } from "./calldata";

export { isMultiSend, unpackMultiSend } from "./calldata";
export { targetsFromTypedData } from "./typed";

export type TxLike = {
	from?: Address;
	to?: Address | null;
	data?: Hex;
	value?: bigint;
	chainId: number;
	authorizationList?: { address: Address; chainId: number }[];
};

export type CallLike = { to?: Address | null; data?: Hex; value?: bigint };

export function targetsFromTransaction(tx: TxLike): Target[] {
	const c = newCollector(tx.chainId, tx.from);
	if (tx.to) collectCall(c, tx.to, tx.data, 0, "tx.to");
	for (const auth of tx.authorizationList ?? []) {
		add(c, auth.address, "delegation", "EIP-7702 authorization");
	}
	return c.out;
}

export function targetsFromCalls(
	calls: CallLike[],
	chainId: number,
	authorizationList?: TxLike["authorizationList"],
	from?: Address,
): Target[] {
	const c = newCollector(chainId, from);
	calls.forEach((call, i) => {
		if (call.to) collectCall(c, call.to, call.data, 0, `batch call ${i + 1}`);
	});
	for (const auth of authorizationList ?? []) {
		add(c, auth.address, "delegation", "EIP-7702 authorization");
	}
	return c.out;
}
