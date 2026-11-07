import { config } from "./config";

type Eip1193 = {
	request(args: { method: string; params?: unknown }): Promise<unknown>;
};

export type SnapPin = { name: string; pubRegistry: string; pinnedAt: number };

function provider(): Eip1193 | undefined {
	return (window as unknown as { ethereum?: Eip1193 }).ethereum;
}

export type SnapStatus =
	| "no-wallet"
	| "not-flask"
	| "not-installed"
	| "installed";

export async function snapStatus(): Promise<SnapStatus> {
	const eth = provider();
	if (!eth) return "no-wallet";
	const version = String(await eth.request({ method: "web3_clientVersion" }));
	if (!/flask/i.test(version)) return "not-flask";
	const snaps = (await eth.request({ method: "wallet_getSnaps" })) as Record<
		string,
		unknown
	>;
	return config.snapId in snaps ? "installed" : "not-installed";
}

export async function installSnap() {
	await provider()?.request({
		method: "wallet_requestSnaps",
		params: { [config.snapId]: {} },
	});
}

async function invoke<T>(method: string, params?: unknown): Promise<T> {
	const eth = provider();
	if (!eth) throw new Error("No wallet found");
	return (await eth.request({
		method: "wallet_invokeSnap",
		params: { snapId: config.snapId, request: { method, params } },
	})) as T;
}

export const snapPins = () => invoke<SnapPin[]>("codemark_pins");
export const snapPin = (name: string) =>
	invoke<{ pinned: boolean }>("codemark_pin", { name });
export const snapUnpin = (name: string) =>
	invoke<{ unpinned: boolean }>("codemark_unpin", { name });

const sepoliaHex = `0x${config.chainId.toString(16)}`;

export async function proposeTransaction(to: `0x${string}`) {
	const eth = provider();
	if (!eth) throw new Error("No wallet found");
	const [from] = (await eth.request({
		method: "eth_requestAccounts",
	})) as string[];
	await eth.request({
		method: "wallet_switchEthereumChain",
		params: [{ chainId: sepoliaHex }],
	});
	return (await eth.request({
		method: "eth_sendTransaction",
		params: [{ from, to, value: "0x0" }],
	})) as string;
}
