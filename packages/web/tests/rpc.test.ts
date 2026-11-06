import { afterAll, describe, expect, test } from "bun:test";
import type { CheckResult } from "@codemark/shared/check";
import { sepoliaRpcUrls } from "@codemark/shared/ens/client";
import { isUnfinished, retryUntilFinished } from "../src/lib/checker";
import { createEns, rpcOrder } from "../src/lib/rpc";

function fakeRpc(respond: () => Response) {
	const hits = { count: 0 };
	const server = Bun.serve({
		port: 0,
		fetch() {
			hits.count++;
			return respond();
		},
	});
	return { url: server.url.href, hits, stop: () => server.stop(true) };
}

const blockFifty = () =>
	Response.json({ jsonrpc: "2.0", id: 1, result: "0x32" });
const servers: { stop: () => void }[] = [];
function serve(respond: () => Response) {
	const rpc = fakeRpc(respond);
	servers.push(rpc);
	return rpc;
}

afterAll(() => {
	for (const server of servers) server.stop();
});

function result(fields: Partial<CheckResult["results"][number]>) {
	return {
		results: [{ verdicts: [], ...fields }],
	} as unknown as CheckResult;
}

describe("rpcOrder", () => {
	test("keeps the public RPCs in their set order", () => {
		expect(rpcOrder(undefined)).toEqual(sepoliaRpcUrls);
	});

	test("tries a keyed RPC first", () => {
		expect(rpcOrder("https://keyed")).toEqual([
			"https://keyed",
			...sepoliaRpcUrls,
		]);
	});

	test("does not repeat a keyed RPC that is also public", () => {
		const first = sepoliaRpcUrls[0] as string;
		expect(rpcOrder(first)).toEqual(sepoliaRpcUrls);
	});
});

describe("createEns", () => {
	test("moves on when the first RPC is rate limited", async () => {
		const limited = serve(() => new Response("{}", { status: 429 }));
		const healthy = serve(blockFifty);
		const { publicClient } = createEns([limited.url, healthy.url]);
		expect(await publicClient.getBlockNumber()).toBe(50n);
		expect(limited.hits.count).toBeGreaterThan(0);
		expect(healthy.hits.count).toBe(1);
	});

	test("moves on when the first RPC is down", async () => {
		const down = serve(() => new Response("{}", { status: 503 }));
		const healthy = serve(blockFifty);
		const { publicClient } = createEns([down.url, healthy.url]);
		expect(await publicClient.getBlockNumber()).toBe(50n);
	});
});

describe("retryUntilFinished", () => {
	test("runs again until a check finishes", async () => {
		let runs = 0;
		const value = await retryUntilFinished(
			async () => ++runs,
			(n) => n < 3,
			[0, 0, 0],
		);
		expect(value).toBe(3);
		expect(runs).toBe(3);
	});

	test("does not run a finished check again", async () => {
		let runs = 0;
		await retryUntilFinished(
			async () => ++runs,
			() => false,
			[0, 0, 0],
		);
		expect(runs).toBe(1);
	});

	test("recovers from a run that throws", async () => {
		let runs = 0;
		const value = await retryUntilFinished(
			async () => {
				if (++runs === 1) throw new Error("rate limited");
				return "done";
			},
			() => false,
			[0, 0],
		);
		expect(value).toBe("done");
	});

	test("gives back the last answer when it never finishes", async () => {
		let runs = 0;
		const value = await retryUntilFinished(
			async () => ++runs,
			() => true,
			[0, 0],
		);
		expect(value).toBe(3);
	});

	test("reports the failure when every run throws", async () => {
		await expect(
			retryUntilFinished(
				async () => {
					throw new Error("all down");
				},
				() => false,
				[0],
			),
		).rejects.toThrow("all down");
	});
});

describe("isUnfinished", () => {
	test("a real mismatch is an answer, so it is not retried", () => {
		const mismatch = {
			verdict: "MISMATCH",
			publisher: "a.eth",
			pinned: true,
			source: "pinned",
		};
		expect(isUnfinished(result({ verdicts: [mismatch] as never }))).toBe(false);
	});

	test("a pinned check that could not finish is retried", () => {
		const failed = {
			verdict: "MISMATCH",
			checkFailed: "network",
			publisher: "a.eth",
			pinned: true,
			source: "pinned",
		};
		expect(isUnfinished(result({ verdicts: [failed] as never }))).toBe(true);
	});

	test("an unavailable index or a target error is retried", () => {
		expect(isUnfinished(result({ indexUnavailable: true }))).toBe(true);
		expect(isUnfinished(result({ error: "boom" }))).toBe(true);
	});
});
