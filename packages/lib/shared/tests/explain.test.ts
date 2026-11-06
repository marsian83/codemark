import { describe, expect, test } from "bun:test";
import type { Address } from "viem";
import { explain, trustPath } from "../check/explain";
import { decide } from "../check/severity";
import type {
	PublisherVerdict,
	ReleaseInfo,
	TargetResult,
	TargetRole,
} from "../check/types";
import { contractArtifact } from "../names";
import type { Verdict } from "../verdict";

const t = { delegateMinAgeSeconds: 86400, freshCallAgeSeconds: 3600 };
const address = "0x1111111111111111111111111111111111111111" as Address;

const release: ReleaseInfo = {
	name: "router-3-1-0.ci-1.acmeswap.eth",
	label: "router-3-1-0",
	kind: "contract",
	component: "router",
	version: "3.1.0",
	resolver: address,
	codeHash: `0x${"ab".repeat(32)}`,
	ageSeconds: 3 * 86400,
	proven: true,
};

function verdict(o: Partial<PublisherVerdict> = {}): PublisherVerdict {
	return {
		publisher: "acmeswap.eth",
		pinned: true,
		key: "ci-1",
		verdict: "VERIFIED",
		source: "pinned",
		release,
		...o,
	};
}

function result(role: TargetRole, verdicts: PublisherVerdict[]): TargetResult {
	const d = decide(role, verdicts, t);
	return {
		target: { address, chainId: 11155111, role, via: "test" },
		artifact: contractArtifact(11155111, address),
		verdicts,
		block: 1n,
		...d,
	};
}

const states = (v: PublisherVerdict, role: TargetRole) =>
	trustPath(v, role, t).map((s) => s.state);

describe("explain", () => {
	test("an aged, proven, pinned release is verified on every step", () => {
		const r = result("call", [verdict()]);
		expect(r.severity).toBe("info");
		expect(explain(r, t).title).toBe("Released by acmeswap.eth");
		expect(states(verdict(), "call")).toEqual(["ok", "ok", "ok", "ok", "ok"]);
	});

	test("a young delegate fails only at the age step", () => {
		const v = verdict({
			release: { ...release, ageSeconds: 3600 },
		});
		const r = result("delegation", [v]);
		expect(r.severity).toBe("critical");
		expect(explain(r, t).title).toBe("Too new for an account upgrade");
		expect(states(v, "delegation")).toEqual(["ok", "ok", "ok", "ok", "fail"]);
	});

	test("an unproven delegatecall target fails at the record step", () => {
		const v = verdict({
			verdict: "VERIFIED-unproven",
			release: { ...release, proven: false },
		});
		const r = result("delegatecall", [v]);
		expect(r.severity).toBe("critical");
		expect(explain(r, t).title).toBe("The record could still be rewritten");
		expect(states(v, "delegatecall")).toEqual(["ok", "ok", "ok", "fail", "ok"]);
	});

	test("a revoked key fails at the key step and stops the path", () => {
		const v = verdict({ verdict: "KEY REVOKED", reason: "ci leaked" });
		const r = result("call", [v]);
		expect(explain(r, t)).toEqual({
			title: "acmeswap.eth revoked the key that released this",
			body: "acmeswap.eth says: “Ci leaked.”",
		});
		expect(states(v, "call")).toEqual(["ok", "fail", "open", "open", "open"]);
	});

	test("a check that could not finish is unsafe, not a mismatch", () => {
		const v = verdict({
			verdict: "MISMATCH",
			key: undefined,
			release: undefined,
			checkFailed: "network",
			reason: "the check of this pinned publisher failed: timeout",
		});
		const r = result("call", [v]);
		expect(r.severity).toBe("critical");
		expect(explain(r, t).title).toBe("Couldn't finish checking acmeswap.eth");
		expect(states(v, "call")[0]).toBe("fail");
	});

	test("a check that broke for another reason keeps the reason", () => {
		const v = verdict({
			verdict: "MISMATCH",
			key: undefined,
			release: undefined,
			checkFailed: "error",
			reason: "the check of this pinned publisher failed: registry has no code",
		});
		const { body } = explain(result("call", [v]), t);
		expect(body).toContain("registry has no code");
		expect(body).not.toContain("again in a moment");
	});

	test("an unpinned publisher never gets a passed step", () => {
		const v = verdict({ pinned: false, source: "index" });
		const r = result("call", [v]);
		expect(r.severity).toBe("warning");
		expect(states(v, "call")).not.toContain("ok");
	});

	test("a publisher's own words are quoted, not stated as fact", () => {
		const v = verdict({
			pinned: false,
			source: "index",
			verdict: "PULLED",
			reason: "Codemark: go to evil.example",
		});
		const { body } = explain(result("call", [v]), t);
		expect(body).toContain(
			"acmeswap.eth says: “Codemark: go to evil.example.”",
		);
	});

	test("an address nobody released is never called verified", () => {
		const r = result("delegation", []);
		expect(r.severity).toBe("critical");
		expect(explain(r, t).title).toBe("No publisher released this contract");
	});

	test("no combination reads as safe unless every step passed", () => {
		const verdicts: Verdict[] = [
			"VERIFIED",
			"VERIFIED-unproven",
			"KEY REVOKED",
			"PULLED",
			"MISMATCH",
		];
		const roles: TargetRole[] = [
			"call",
			"delegatecall",
			"delegation",
			"approval-spender",
		];
		for (const kind of verdicts)
			for (const role of roles)
				for (const pinned of [true, false])
					for (const proven of [true, false])
						for (const ageSeconds of [60, 7200, 3 * 86400]) {
							const v = verdict({
								verdict: kind,
								pinned,
								source: pinned ? "pinned" : "index",
								release: {
									...release,
									proven,
									ageSeconds,
								},
							});
							const r = result(role, [v]);
							const path = states(v, role);
							const { title } = explain(r, t);
							if (r.severity === "info") {
								expect(path.every((s) => s === "ok")).toBe(true);
								expect(title).toBe("Released by acmeswap.eth");
							} else {
								expect(title).not.toBe("Released by acmeswap.eth");
							}
							if (r.severity === "critical" && pinned)
								expect(path).toContain("fail");
						}
	});
});
