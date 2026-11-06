import { describe, expect, test } from "bun:test";
import { checkTargets } from "../check";
import { createEnsClient } from "../ens/client";

const rpc =
	process.env.SEPOLIA_RPC_URL ?? "https://sepolia.gateway.tenderly.co";
const live = process.env.CODEMARK_LIVE_TESTS === "0" ? test.skip : test;

const deps = () => ({
	ens: createEnsClient(rpc),
	now: Math.floor(Date.now() / 1000),
	delegateMinAgeSeconds: 86_400,
	freshCallAgeSeconds: 3_600,
});

const random = () =>
	`0x${Array.from(crypto.getRandomValues(new Uint8Array(20)), (b) => b.toString(16).padStart(2, "0")).join("")}` as const;

describe("live Sepolia, read-only", () => {
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
