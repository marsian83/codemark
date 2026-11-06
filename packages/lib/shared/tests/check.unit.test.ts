import { describe, expect, test } from "bun:test";
import { type Address, type Hex, keccak256, labelhash, toHex } from "viem";
import type { Found, IncidentColumns, ReleaseColumns } from "../arkiv/rows";
import {
	codeProblem,
	labelMatchesRecord,
	recordProblem,
	sameLabel,
	splitReleaseName,
	versionLabel,
} from "../check/binding";
import { rootOnlyRoles } from "../check/proof";
import {
	incidentRowProblem,
	releaseRowProblem,
	sanitizeReason,
} from "../check/rows";
import { decide } from "../check/severity";
import type { PublisherVerdict } from "../check/types";
import { registryRoles } from "../ens/roles";
import { contractArtifact, forwardLabel } from "../names";
import { parseRecord } from "../record";

const target = "0x1111111111111111111111111111111111111111" as Address;
const ci = "0x2222222222222222222222222222222222222222" as Address;
const other = "0x3333333333333333333333333333333333333333" as Address;
const artifact = contractArtifact(11155111, target);
const h = keccak256("0x6000") as Hex;
const recordText = `v1;k=contract;n=router;c=11155111;h=${h};v=3.1.0;g=${"a".repeat(40)}`;
const record = parseRecord(recordText);
if (!record) throw new Error("record fixture does not parse");

const meta = (
	o: Partial<Found<unknown>["meta"]> = {},
): Found<unknown>["meta"] => ({
	entityKey: `0x${"00".repeat(32)}`,
	creator: ci,
	owner: ci,
	readonly: true,
	permissionlessExtension: true,
	createdBlock: 1n,
	expiresBlock: 2n,
	queryBlock: 1n,
	...o,
});

const releaseRow = (
	o: Partial<ReleaseColumns> = {},
): Found<ReleaseColumns> => ({
	row: {
		artifact,
		keyRegistry: other,
		publisher: "acmeswap.eth",
		keyLabel: "ci-1",
		name: "router-3-1-0.ci-1.acmeswap.eth",
		labelhash: labelhash("router-3-1-0"),
		resolverBlock: 10n,
		regBlock: 11n,
		kind: "contract",
		version: "3.1.0",
		...o,
	},
	meta: meta(),
});

describe("name binding", () => {
	test("version labels follow <component>-<maj>-<min>-<patch>", () => {
		expect(versionLabel("router", "3.1.0")).toBe("router-3-1-0");
		expect(versionLabel("router", "3.1")).toBeUndefined();
		expect(versionLabel("router", "3.1.0-rc.1")).toBeUndefined();
		expect(versionLabel("Router", "1.0.0")).toBeUndefined();
	});

	test("release names split into label, key and publisher", () => {
		expect(splitReleaseName("router-3-1-0.ci-1.acmeswap.eth")).toEqual({
			label: "router-3-1-0",
			key: "ci-1",
			publisher: "acmeswap.eth",
		});
		expect(splitReleaseName("ci-1.acmeswap.eth")).toBeUndefined();
		expect(splitReleaseName("Router.ci-1.acmeswap.eth")).toBeUndefined();
	});

	test("a record binds only under its version label or the artifact's forward label", () => {
		expect(labelMatchesRecord("router-3-1-0", record, artifact)).toBe(true);
		expect(labelMatchesRecord(forwardLabel(artifact), record, artifact)).toBe(
			true,
		);
		expect(labelMatchesRecord("router-3-2-0", record, artifact)).toBe(false);
		const elsewhere = contractArtifact(11155111, other);
		expect(labelMatchesRecord(forwardLabel(elsewhere), record, artifact)).toBe(
			false,
		);
	});

	test("record checks: address, chain, kind, delegation", () => {
		const call = { address: target, chainId: 11155111, role: "call" };
		expect(recordProblem(record, call, target)).toBeUndefined();
		expect(recordProblem(record, call, other)).toContain("different address");
		expect(recordProblem(record, { ...call, chainId: 1 }, target)).toContain(
			"chain",
		);
		expect(
			recordProblem(record, { ...call, role: "delegation" }, target),
		).toContain("delegate");
		const delegate = { ...record, kind: "delegate" as const };
		expect(
			recordProblem(delegate, { ...call, role: "delegation" }, target),
		).toBeUndefined();
		expect(recordProblem({ ...record, kind: "web" }, call, target)).toContain(
			"frontend",
		);
	});

	test("code hash and EIP-1967 implementation must both match", () => {
		expect(codeProblem(record, { codeHash: h })).toBeUndefined();
		expect(codeProblem(record, { codeHash: keccak256("0x00") })).toContain(
			"code hash",
		);
		expect(
			codeProblem(record, { codeHash: h, implementation: other }),
		).toContain("implementation");
		const proxy = {
			...record,
			implementation: other,
			implementationCodehash: h,
		};
		expect(
			codeProblem(proxy, {
				codeHash: h,
				implementation: other,
				implementationCodeHash: h,
			}),
		).toBeUndefined();
		expect(
			codeProblem(proxy, {
				codeHash: h,
				implementation: ci,
				implementationCodeHash: h,
			}),
		).toContain("different implementation");
		expect(
			codeProblem(proxy, {
				codeHash: h,
				implementation: other,
				implementationCodeHash: keccak256("0x01"),
			}),
		).toContain("implementation code");
	});

	test("empty code, 7702-delegated accounts and beacon proxies never verify", () => {
		expect(codeProblem(record, { codeHash: h, empty: true })).toContain(
			"no code",
		);
		expect(codeProblem(record, { codeHash: h, delegated: true })).toContain(
			"7702",
		);
		expect(codeProblem(record, { codeHash: h, beacon: other })).toContain(
			"beacon",
		);
	});

	test("token ids compare without their version bits", () => {
		const id = BigInt(labelhash("ci-1"));
		const versioned = (id ^ (id & 0xffffffffn)) | 7n;
		expect(sameLabel(versioned, "ci-1")).toBe(true);
		expect(sameLabel(versioned, "ci-2")).toBe(false);
	});
});

describe("index row authentication (shape)", () => {
	test("a well-formed row passes", () => {
		expect(releaseRowProblem(releaseRow())).toEqual({
			split: { label: "router-3-1-0", key: "ci-1", publisher: "acmeswap.eth" },
		});
	});

	test("a row transferred to another owner is rejected", () => {
		const row = { ...releaseRow(), meta: meta({ owner: other }) };
		expect(releaseRowProblem(row)).toEqual({
			problem: "the row was transferred away from its creator",
		});
	});

	test("a mutable row is rejected", () => {
		const row = { ...releaseRow(), meta: meta({ readonly: false }) };
		expect("problem" in releaseRowProblem(row)).toBe(true);
	});

	test("name, key, publisher and labelhash must agree", () => {
		expect(
			"problem" in releaseRowProblem(releaseRow({ keyLabel: "ci-2" })),
		).toBe(true);
		expect(
			"problem" in
				releaseRowProblem(releaseRow({ publisher: "acmeswap-app.eth" })),
		).toBe(true);
		expect(
			"problem" in
				releaseRowProblem(releaseRow({ labelhash: labelhash("router-3-2-0") })),
		).toBe(true);
		expect("problem" in releaseRowProblem(releaseRow({ regBlock: 9n }))).toBe(
			true,
		);
	});

	test("cut incidents need linkBlock and the right action", () => {
		const cut: Found<IncidentColumns> = {
			row: {
				action: "cut",
				keyRegistry: other,
				name: "ci-1.acmeswap.eth",
				reason: "CI key leaked",
				ensTx: `0x${"11".repeat(32)}`,
				block: 5n,
				linkBlock: 3n,
			},
			meta: meta(),
		};
		expect(incidentRowProblem(cut, "cut")).toBeUndefined();
		expect(incidentRowProblem(cut, "pull")).toBe("not a pull incident");
		expect(
			incidentRowProblem(
				{ ...cut, row: { ...cut.row, linkBlock: undefined } },
				"cut",
			),
		).toContain("linkBlock");
		expect(
			incidentRowProblem({ ...cut, meta: meta({ owner: other }) }, "cut"),
		).toContain("transferred");
	});

	test("incident reasons are display text: control and bidi characters are stripped", () => {
		expect(sanitizeReason("CI key‮ leaked\n")).toBe("CI key leaked");
		expect(sanitizeReason("x".repeat(400)).length).toBe(280);
	});
});

describe("role counting", () => {
	const reader = (counts: bigint, rootRoles: bigint) => ({
		roleCount: async () => counts,
		roles: async () => rootRoles,
	});
	const { ROLE_REGISTRAR, ROLE_UNREGISTER, ROLE_SET_RESOLVER } = registryRoles;

	test("root as sole holder passes", async () => {
		const held = ROLE_REGISTRAR | ROLE_SET_RESOLVER;
		expect(await rootOnlyRoles(reader(held, held), ci)).toBe(true);
	});

	test("a second holder of any role fails", async () => {
		const held = ROLE_REGISTRAR | ROLE_SET_RESOLVER;
		expect(
			await rootOnlyRoles(reader(held + ROLE_SET_RESOLVER, held), ci),
		).toBe(false);
		expect(await rootOnlyRoles(reader(held | ROLE_UNREGISTER, held), ci)).toBe(
			false,
		);
	});

	test("CI registrars and security unregisterers are allowed on key registries", async () => {
		const held = ROLE_REGISTRAR | ROLE_UNREGISTER | ROLE_SET_RESOLVER;
		const counts = held + ROLE_REGISTRAR + ROLE_UNREGISTER;
		expect(
			await rootOnlyRoles(
				reader(counts, held),
				ci,
				ROLE_REGISTRAR | ROLE_UNREGISTER,
			),
		).toBe(true);
		expect(
			await rootOnlyRoles(
				reader(counts + ROLE_SET_RESOLVER, held),
				ci,
				ROLE_REGISTRAR | ROLE_UNREGISTER,
			),
		).toBe(false);
	});
});

describe("severity", () => {
	const t = { delegateMinAgeSeconds: 86_400, freshCallAgeSeconds: 3_600 };
	const verified = (
		o: Partial<PublisherVerdict> = {},
		age = 100_000,
		proven = true,
	): PublisherVerdict => ({
		publisher: "acmeswap.eth",
		pinned: true,
		key: "ci-1",
		verdict: proven ? "VERIFIED" : "VERIFIED-unproven",
		source: "pinned",
		release: {
			name: "router-3-1-0.ci-1.acmeswap.eth",
			label: "router-3-1-0",
			kind: "contract",
			component: "router",
			version: "3.1.0",
			resolver: other,
			codeHash: h,
			proven,
			ageSeconds: proven ? age : undefined,
		},
		...o,
	});

	test("pinned, proven and old is info", () => {
		const d = decide("call", [verified()], t);
		expect(d.severity).toBe("info");
		expect(d.headline).toBe(
			"acmeswap.eth · ci-1 · router 3.1.0 · proven · published 27 h ago",
		);
	});

	test("pinned results under the fresh threshold are amber for calls", () => {
		expect(decide("call", [verified({}, 40)], t)).toEqual({
			severity: "amber",
			headline:
				"acmeswap.eth · ci-1 · router 3.1.0 · proven · published 40 s ago",
		});
	});

	test("unproven pinned results are warnings for calls, critical for delegatecall", () => {
		expect(
			decide("approval-spender", [verified({}, 0, false)], t).severity,
		).toBe("warning");
		expect(decide("delegatecall", [verified({}, 0, false)], t).severity).toBe(
			"critical",
		);
	});

	test("delegations need a pinned, proven release older than the threshold", () => {
		expect(decide("delegation", [verified({}, 100_000)], t).severity).toBe(
			"info",
		);
		expect(decide("delegation", [verified({}, 3_600)], t).severity).toBe(
			"critical",
		);
		expect(
			decide("delegation", [verified({ pinned: false, source: "index" })], t)
				.severity,
		).toBe("critical");
		expect(decide("delegation", [], t).severity).toBe("critical");
	});

	test("a pinned publisher's revocation is critical and names the reason", () => {
		const d = decide(
			"call",
			[
				verified({
					verdict: "KEY REVOKED",
					reason: "CI key leaked",
					release: undefined,
				}),
			],
			t,
		);
		expect(d).toEqual({
			severity: "critical",
			headline: "KEY REVOKED by acmeswap.eth: CI key leaked",
		});
	});

	test("an unpinned revocation is only a warning", () => {
		const d = decide(
			"call",
			[
				verified({
					pinned: false,
					source: "index",
					verdict: "PULLED",
					release: undefined,
				}),
			],
			t,
		);
		expect(d.severity).toBe("warning");
		expect(d.headline).toStartWith("Disputed by acmeswap.eth");
	});

	test("unpinned vouches are warnings, never green", () => {
		const d = decide(
			"call",
			[
				verified({
					pinned: false,
					source: "index",
					publisher: "acmeswap-app.eth",
				}),
			],
			t,
		);
		expect(d).toEqual({
			severity: "warning",
			headline: "Vouched for by acmeswap-app.eth (not pinned)",
		});
	});

	test("unknown, flooded and incomplete index are warnings", () => {
		expect(decide("call", [], t).severity).toBe("warning");
		expect(decide("call", [], t, { indexFlooded: true }).headline).toContain(
			"flooded",
		);
		expect(decide("call", [], t, { indexIncomplete: true }).headline).toContain(
			"incomplete",
		);
	});
});

test("forward labels are a- plus 12 hex of keccak(artifact)", () => {
	expect(forwardLabel(artifact)).toBe(
		`a-${keccak256(toHex(artifact)).slice(2, 14)}`,
	);
});
