import { describe, expect, test } from "bun:test";
import { formatRecord, parseRecord } from "@codemark/shared/record";
import { type Address, zeroAddress } from "viem";
import { envSchema, parseEnvFile } from "../env";
import { ciGrantFlag } from "../lib/flags";
import { checkCiGrant, isDelegateKey } from "../ops/addKey";
import { checkMigrationGrant } from "../ops/migrate";
import {
	isBurned,
	planRegistration,
	publishProblem,
	type RegistrationState,
} from "../ops/publish";
import { type LabelState, planPull } from "../ops/pull";

const a = (n: number) => `0x${n.toString(16).padStart(40, "0")}` as Address;
const ci = a(1);
const sec = a(2);
const owner = a(3);
const safe = a(4);
const res1 = a(5);
const res2 = a(6);

describe("item 2: CI grants are explicit and never land on delegates", () => {
	test("add-key/migrate need --ci or --root-only, not both", () => {
		expect(() => ciGrantFlag({})).toThrow(/--ci <address>.*--root-only/);
		expect(() => ciGrantFlag({ ci, "root-only": true })).toThrow(/not both/);
		expect(ciGrantFlag({ "root-only": true })).toBeUndefined();
		expect(ciGrantFlag({ ci })).toBe(ci as Address);
	});

	test("delegate keys, the sec key and the root never become CI", () => {
		const base = { key: "ci-1", ci, sec, owner, root: safe };
		expect(() => checkCiGrant(base)).not.toThrow();
		expect(() => checkCiGrant({ ...base, key: "delegates" })).toThrow(
			/never gets a CI grant/,
		);
		expect(() => checkCiGrant({ ...base, key: "delegates-2" })).toThrow();
		expect(() => checkCiGrant({ ...base, ci: sec })).toThrow(/sec key/);
		expect(() => checkCiGrant({ ...base, ci: owner })).toThrow(/Safe owner/);
		expect(() => checkCiGrant({ ...base, ci: safe })).toThrow(/root Safe/);
		expect(() =>
			checkCiGrant({ ...base, key: "delegates", ci: undefined }),
		).not.toThrow();
		expect(isDelegateKey("delegates")).toBe(true);
		expect(isDelegateKey("ci-1")).toBe(false);
	});

	test("migrate keeps a root-only key root-only, and a CI key a CI key", () => {
		expect(() => checkMigrationGrant("delegates", true, ci)).toThrow(
			/--root-only/,
		);
		expect(() => checkMigrationGrant("ci-1", false, undefined)).toThrow(/--ci/);
		expect(() =>
			checkMigrationGrant("delegates", true, undefined),
		).not.toThrow();
		expect(() => checkMigrationGrant("ci-1", false, ci)).not.toThrow();
	});
});

describe("item 3: pull always derives the forward name", () => {
	const live = (resolver: Address): LabelState => ({ status: 2, resolver });
	const reserved: LabelState = { status: 1, resolver: zeroAddress };
	const base = { label: "router-3-1-0", derived: "a-45edab577bd7" };

	test("a mistyped --forward is refused", () => {
		expect(() =>
			planPull({
				...base,
				given: "a-000000000000",
				release: live(res1),
				forward: live(res1),
			}),
		).toThrow(/not this release's forward name/);
	});

	test("both names must share the resolver", () => {
		expect(() =>
			planPull({ ...base, release: live(res1), forward: live(res2) }),
		).toThrow(/do not share a resolver/);
	});

	test("pulls both, or finishes a half-pulled release", () => {
		expect(
			planPull({ ...base, release: live(res1), forward: live(res1) }).pull,
		).toEqual(["router-3-1-0", "a-45edab577bd7"]);
		expect(
			planPull({ ...base, release: reserved, forward: live(res1) }).pull,
		).toEqual(["a-45edab577bd7"]);
		expect(() =>
			planPull({ ...base, release: reserved, forward: reserved }),
		).toThrow(/already pulled/);
		expect(() =>
			planPull({ ...base, derived: undefined, release: reserved }),
		).toThrow(/--target/);
	});
});

describe("item 4: burned labels are refused", () => {
	const fresh: RegistrationState = {
		status: 0,
		tokenId: 0n,
		expiry: 0n,
		resolver: zeroAddress,
	};
	const names = {
		name: "router-3-1-0.ci-1.a.eth",
		forwardName: "a-x.ci-1.a.eth",
		key: "ci-1",
	};

	test("a nonzero token version or past expiry means burned", () => {
		expect(isBurned(fresh)).toBe(false);
		expect(isBurned({ ...fresh, tokenId: (1n << 255n) | 1n })).toBe(true);
		expect(isBurned({ ...fresh, expiry: 1n })).toBe(true);
	});

	test("publish refuses a burned version label and suggests bumping it", () => {
		expect(() =>
			planRegistration({
				...names,
				release: { ...fresh, expiry: 5n },
				forward: fresh,
				resumable: false,
			}),
		).toThrow(/bump the version/);
		expect(
			planRegistration({
				...names,
				release: fresh,
				forward: fresh,
				resumable: false,
			}),
		).toEqual({ deploy: true, register: ["release", "forward"] });
	});

	test("item 9: a half-finished publish resumes with only the forward name", () => {
		const registered = { status: 2, tokenId: 7n, expiry: 99n, resolver: res1 };
		expect(
			planRegistration({
				...names,
				release: registered,
				forward: fresh,
				resumable: true,
			}),
		).toEqual({ deploy: false, register: ["forward"] });
		expect(() =>
			planRegistration({
				...names,
				release: registered,
				forward: fresh,
				resumable: false,
			}),
		).toThrow(/already registered/);
	});
});

describe("item 5: publish mirrors the checker before sending", () => {
	const record = parseRecord(
		formatRecord({
			kind: "contract",
			component: "router",
			chainId: 11155111,
			codehash: `0x${"ab".repeat(32)}`,
			version: "1.0.0",
		}),
	);
	if (!record) throw new Error("fixture");
	const facts = { codeHash: `0x${"ab".repeat(32)}` as const };
	const ok = { record, facts, soleRootRegistrar: true, signerCanPull: false };

	test("refuses 7702 accounts, beacon proxies, dual-role signers and CI-writable delegates", () => {
		expect(publishProblem(ok)).toBeUndefined();
		expect(
			publishProblem({ ...ok, facts: { ...facts, delegated: true } }),
		).toMatch(/7702/);
		expect(
			publishProblem({ ...ok, facts: { ...facts, beacon: res1 } }),
		).toMatch(/beacon/);
		expect(publishProblem({ ...ok, signerCanPull: true })).toMatch(
			/ROLE_UNREGISTER/,
		);
		expect(
			publishProblem({
				...ok,
				record: { ...record, kind: "delegate" },
				soleRootRegistrar: false,
			}),
		).toMatch(/only ROLE_REGISTRAR/);
	});
});

describe("item 11: env", () => {
	test("reads codemark/.env lines and rejects a bad-checksum Safe", () => {
		expect(parseEnvFile('A=1\n# c\nB="two"\n')).toEqual({ A: "1", B: "two" });
		expect(() =>
			envSchema.parse({
				CODEMARK_SAFE: "0xDb84D65A3d48E83fF2fF1c76cd7D17421A07b301",
			}),
		).toThrow(/checksum/);
		expect(
			envSchema.parse({
				CODEMARK_SAFE: "0xDb84D65A3d48E83fF2fF1c76cd7D17421A07b300",
			}).CODEMARK_SAFE,
		).toBe("0xDb84D65A3d48E83fF2fF1c76cd7D17421A07b300");
	});
});
