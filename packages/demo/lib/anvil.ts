import type { Address, Hex } from "viem";

export async function rpc<T = unknown>(
	url: string,
	method: string,
	params: unknown[] = [],
): Promise<T> {
	const res = await fetch(url, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
	});
	const body = (await res.json()) as {
		result?: T;
		error?: { message: string };
	};
	if (body.error) throw new Error(`${method}: ${body.error.message}`);
	return body.result as T;
}

export async function isAnvil(url: string): Promise<boolean> {
	try {
		const version = await rpc<string>(url, "web3_clientVersion");
		return version.toLowerCase().includes("anvil");
	} catch {
		return false;
	}
}

export const anvil = (url: string) => ({
	setBalance: (address: Address, wei: bigint) =>
		rpc(url, "anvil_setBalance", [address, `0x${wei.toString(16)}`]),
	increaseTime: (seconds: number) =>
		rpc(url, "evm_increaseTime", [seconds]).then(() => rpc(url, "evm_mine")),
	mine: () => rpc(url, "evm_mine"),
	setAutomine: (on: boolean) => rpc(url, "evm_setAutomine", [on]),
	snapshot: () => rpc<Hex>(url, "evm_snapshot"),
	revert: (id: Hex) => rpc<boolean>(url, "evm_revert", [id]),
	impersonate: (address: Address) =>
		rpc(url, "anvil_impersonateAccount", [address]),
	stopImpersonating: (address: Address) =>
		rpc(url, "anvil_stopImpersonatingAccount", [address]),
	setCode: (address: Address, code: Hex) =>
		rpc(url, "anvil_setCode", [address, code]),
	setStorageAt: (address: Address, slot: Hex, value: Hex) =>
		rpc(url, "anvil_setStorageAt", [address, slot, value]),
	forkInfo: () =>
		rpc<{ forkConfig?: { forkBlockNumber?: number } }>(url, "anvil_nodeInfo"),
});
