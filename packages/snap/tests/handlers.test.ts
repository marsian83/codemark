import { beforeEach, expect, test } from "bun:test";

let store: Record<string, unknown> | null = null;
const g = globalThis as unknown as Record<string, unknown>;

beforeEach(() => {
	store = null;
	g.snap = {
		request: async ({
			method,
			params,
		}: {
			method: string;
			params: { operation?: string; newState?: unknown };
		}) => {
			if (method === "snap_manageState") {
				if (params.operation === "get") return store;
				store = params.newState;
				return null;
			}
			if (method === "snap_dialog") return true;
			throw new Error(method);
		},
	};
	g.ethereum = { request: async () => "0xaa36a7" };
});

test("pins list starts empty and unknown methods fail", async () => {
	const { onRpcRequest } = await import("../src/index");
	const call = (method: string, params?: unknown) =>
		onRpcRequest({
			origin: "http://localhost:3020",
			request: { jsonrpc: "2.0", id: 1, method, params: params as never },
		} as never);
	expect(await call("codemark_pins")).toEqual([]);
	await expect(call("nope")).rejects.toThrow();
	await expect(call("codemark_pin", { name: "not valid" })).rejects.toThrow();
});

test("transaction with no resolvable target returns null", async () => {
	const { onTransaction } = await import("../src/index");
	const out = await onTransaction({
		transaction: { from: "0x" + "11".repeat(20) },
		chainId: "eip155:11155111",
		transactionOrigin: "x",
	} as never);
	expect(out).toBeNull();
});

test("rpc rejects unlisted origins", async () => {
	const { onRpcRequest } = await import("../src/index");
	await expect(
		onRpcRequest({
			origin: "https://evil.example",
			request: { jsonrpc: "2.0", id: 1, method: "codemark_pins" },
		} as never),
	).rejects.toThrow();
});
