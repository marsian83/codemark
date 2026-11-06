import { afterAll, describe, expect, test } from "bun:test";
import {
	type Address,
	BaseError,
	ContractFunctionRevertedError,
	createPublicClient,
	parseAbi,
} from "viem";
import { sepolia as chain } from "viem/chains";
import { failoverTransport } from "../ens/client";

const servers: { stop: (force: boolean) => void }[] = [];
afterAll(() => {
	for (const server of servers) server.stop(true);
});

function rpc(respond: () => Response | Promise<Response>) {
	const hits = { count: 0 };
	const server = Bun.serve({
		port: 0,
		idleTimeout: 0,
		fetch() {
			hits.count++;
			return respond();
		},
	});
	servers.push(server);
	return { url: server.url.href, hits };
}

const answer = (result: unknown) =>
	Response.json({ jsonrpc: "2.0", id: 1, result });
const rpcError = (code: number, message: string, data?: string) =>
	Response.json({ jsonrpc: "2.0", id: 1, error: { code, message, data } });
const hangs = () => new Promise<Response>(() => {});
const healthy = () => answer("0x32");

function client(urls: string[], restMs = 60_000) {
	return createPublicClient({
		chain,
		transport: failoverTransport(urls, { timeoutMs: 150, restMs }),
	});
}

const blockNumber = (c: ReturnType<typeof client>) =>
	c.request({ method: "eth_blockNumber" });

describe("failoverTransport", () => {
	test("does not wait out a long Retry-After", async () => {
		const limited = rpc(
			() =>
				new Response("{}", {
					status: 429,
					headers: { "Retry-After": "2536" },
				}),
		);
		const fine = rpc(healthy);
		const started = Date.now();
		expect(await blockNumber(client([limited.url, fine.url]))).toBe("0x32");
		expect(Date.now() - started).toBeLessThan(1000);
		await expect(blockNumber(client([limited.url]))).rejects.toThrow();
		expect(Date.now() - started).toBeLessThan(2000);
	});

	test("a hung RPC costs one timeout, not one per read", async () => {
		const hung = rpc(hangs);
		const good = rpc(healthy);
		const c = client([hung.url, good.url]);
		const started = Date.now();
		for (let i = 0; i < 10; i++) expect(await blockNumber(c)).toBe("0x32");
		expect(hung.hits.count).toBe(1);
		expect(good.hits.count).toBe(10);
		expect(Date.now() - started).toBeLessThan(1000);
	});

	test("a rate limited or down RPC rests too", async () => {
		for (const status of [429, 503]) {
			const limited = rpc(() => new Response("{}", { status }));
			const good = rpc(healthy);
			const c = client([limited.url, good.url]);
			await blockNumber(c);
			await blockNumber(c);
			expect(limited.hits.count).toBe(1);
		}
	});

	test("a resting RPC goes back to the front afterwards", async () => {
		let down = true;
		const first = rpc(() =>
			down ? new Response("{}", { status: 503 }) : answer("0x1"),
		);
		const second = rpc(healthy);
		const c = client([first.url, second.url], 50);
		expect(await blockNumber(c)).toBe("0x32");
		down = false;
		await Bun.sleep(80);
		expect(await blockNumber(c)).toBe("0x1");
	});

	test("an RPC error moves on for that read but costs no rest", async () => {
		const pruned = rpc(() => rpcError(4444, "pruned history unavailable"));
		const good = rpc(healthy);
		const c = client([pruned.url, good.url]);
		await blockNumber(c);
		await blockNumber(c);
		expect(pruned.hits.count).toBe(2);
	});

	test("a revert is an answer, so no other RPC is asked", async () => {
		const reverts = rpc(() => rpcError(3, "execution reverted", "0x"));
		const good = rpc(healthy);
		const c = client([reverts.url, good.url]);
		const failure = await c
			.readContract({
				address: `0x${"11".repeat(20)}` as Address,
				abi: parseAbi(["function f() view returns (uint256)"]),
				functionName: "f",
			})
			.catch((error) => error);
		expect(failure).toBeInstanceOf(BaseError);
		expect(
			failure.walk((e: unknown) => e instanceof ContractFunctionRevertedError),
		).toBeInstanceOf(ContractFunctionRevertedError);
		expect(good.hits.count).toBe(0);
	});

	test("fails when every RPC is down", async () => {
		const c = client([rpc(hangs).url, rpc(hangs).url]);
		await expect(blockNumber(c)).rejects.toThrow();
	});
});
