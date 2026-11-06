import { describe, expect, test } from "bun:test";
import { getAddress } from "viem";
import type { ArkivSource } from "../arkiv/rows";
import { checkTargets } from "../check";
import type { CheckDeps, Target } from "../check/types";
import type { EnsClient } from "../ens/client";

const chainId = 11155111;
const ens = {
	chain: { id: chainId },
	publicClient: { getBlock: async () => ({ timestamp: 0n }) },
} as unknown as EnsClient;

function target(n: number, role: Target["role"], onChain = chainId): Target {
	return {
		address: getAddress(`0x${String(n).repeat(40)}`),
		chainId: onChain,
		role,
		via: "test",
	};
}

function deps(extra: Partial<CheckDeps>): CheckDeps {
	return {
		ens,
		block: 1n,
		now: 0,
		delegateMinAgeSeconds: 86400,
		freshCallAgeSeconds: 3600,
		...extra,
	};
}

describe("checker limits", () => {
	test("strict targets are checked first and the rest past the cap are not checked", async () => {
		const targets = [
			target(1, "call", 1),
			target(2, "call", 1),
			target(3, "delegation", 1),
		];
		const r = await checkTargets(
			{ targets, pins: [] },
			deps({ maxTargets: 1 }),
		);
		expect(r.results[2]?.error).toBeUndefined();
		expect(r.results[0]?.headline).toBe("Not checked");
		expect(r.results[1]?.severity).toBe("warning");
		expect(r.severity).toBe("critical");
	});

	test("a hung index fails closed for a delegation", async () => {
		const never = () => new Promise<never>(() => {});
		const arkiv = {
			findReleases: never,
			findIncidentsByArtifact: never,
		} as unknown as ArkivSource;
		const r = await checkTargets(
			{ targets: [target(4, "delegation"), target(5, "call")], pins: [] },
			deps({ arkiv, timeoutMs: 50 }),
		);
		expect(r.results[0]?.severity).toBe("critical");
		expect(r.results[0]?.error).toContain("ran out of time");
		expect(r.results[1]?.severity).toBe("warning");
	});
});
