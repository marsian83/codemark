import { describe, expect, test } from "bun:test";
import { createPublicClient, http, type PublicClient } from "viem";
import { sepolia as sepoliaChain } from "viem/chains";
import { createArkivReader } from "../arkiv/client";
import { createArkivSource } from "../arkiv/source";
import { checkTargets, type Pin } from "../check";
import { createEnsClient, sepoliaRpcUrls } from "../ens/client";

const rpc =
	process.env.SEPOLIA_RPC_URL ?? "https://sepolia.gateway.tenderly.co";
const live = process.env.CODEMARK_LIVE_TESTS === "0" ? test.skip : test;

const deps = () => ({
	ens: createEnsClient(rpc),
	now: Math.floor(Date.now() / 1000),
	delegateMinAgeSeconds: 86_400,
	freshCallAgeSeconds: 3_600,
});

const router = "0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E" as const;
const pwnmeswap = {
	name: "pwnmeswap.eth",
	pubRegistry: "0x8a8d97f3F4d1235c62aE61cDB3644f574162d204",
} as const;

const random = () =>
	`0x${Array.from(crypto.getRandomValues(new Uint8Array(20)), (b) => b.toString(16).padStart(2, "0")).join("")}` as const;

describe("live Sepolia, read-only", () => {
	live(
		"once a pinned publisher answers, unpinned ones are not evaluated",
		async () => {
			const arkiv = createArkivSource(createArkivReader());
			const target = {
				address: router,
				chainId: 11155111,
				role: "call" as const,
				via: "to",
			};
			const publishers = async (pins: Pin[]) => {
				const res = await checkTargets(
					{ targets: [target], pins },
					{ ...deps(), arkiv },
				);
				return res.results[0]?.verdicts.map((v) => v.publisher) ?? [];
			};
			expect(await publishers([pwnmeswap])).toEqual(["pwnmeswap.eth"]);
			expect((await publishers([])).length).toBeGreaterThan(1);
		},
		120_000,
	);

	live(
		"no read is sent twice in one check",
		async () => {
			const seen = new Map<string, number>();
			const ens = {
				...createEnsClient(rpc),
				publicClient: createPublicClient({
					chain: sepoliaChain,
					transport: http(sepoliaRpcUrls[0], {
						retryCount: 0,
						onFetchRequest: async (request) => {
							const body = await request.clone().json();
							for (const call of [body].flat()) {
								const key = JSON.stringify([call.method, call.params]);
								seen.set(key, (seen.get(key) ?? 0) + 1);
							}
						},
					}),
				}) as PublicClient,
			};
			await checkTargets(
				{
					targets: [
						{ address: router, chainId: 11155111, role: "call", via: "to" },
					],
					pins: [pwnmeswap],
				},
				{ ...deps(), ens, arkiv: createArkivSource(createArkivReader()) },
			);
			const repeats = [...seen].filter(([, count]) => count > 1);
			expect(repeats).toEqual([]);
		},
		120_000,
	);

	live(
		"the default client still reads logs older than the first RPC keeps",
		async () => {
			const { publicClient, deployment } = createEnsClient();
			const head = await publicClient.getBlockNumber();
			const old = head - 100_000n;
			const logs = await publicClient.getLogs({
				address: deployment.ethRegistry,
				fromBlock: old,
				toBlock: old + 2_000n,
			});
			expect(Array.isArray(logs)).toBe(true);
		},
		60_000,
	);

	live(
		"a random address is UNKNOWN: warning for calls, critical for delegations",
		async () => {
			const address = random();
			const res = await checkTargets(
				{
					targets: [
						{ address, chainId: 11155111, role: "call", via: "to" },
						{ address, chainId: 11155111, role: "delegation", via: "7702" },
					],
					pins: [],
				},
				deps(),
			);
			const [call, delegation] = res.results;
			expect(call?.error).toBeUndefined();
			expect(call?.severity).toBe("warning");
			expect(call?.headline).toStartWith("Unknown");
			expect(delegation?.severity).toBe("critical");
			expect(res.severity).toBe("critical");
		},
		60_000,
	);

	live(
		"a pin whose registry no longer matches is critical",
		async () => {
			const res = await checkTargets(
				{
					targets: [
						{ address: random(), chainId: 11155111, role: "call", via: "to" },
					],
					pins: [
						{
							name: "test.eth",
							pubRegistry: "0x0000000000000000000000000000000000000001",
						},
					],
				},
				deps(),
			);
			expect(res.results[0]?.verdicts[0]?.verdict).toBe("MISMATCH");
			expect(res.severity).toBe("critical");
		},
		60_000,
	);
});
