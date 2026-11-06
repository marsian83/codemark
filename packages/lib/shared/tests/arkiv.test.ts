import { describe, expect, test } from "bun:test";
import { releaseDeadline } from "../../../cli/arkiv/writer";
import type { ArkivReader } from "../arkiv/client";
import { incidentColumns, releaseColumns } from "../arkiv/rows";
import { createArkivSource } from "../arkiv/source";

const artifact = `eip155:11155111:0x${"ab".repeat(20)}`;
const registry = `0x${"cd".repeat(20)}`;

const release = {
	artifact,
	keyRegistry: registry,
	publisher: "acme.eth",
	keyLabel: "ci-1",
	name: "router-1.ci-1.acme.eth",
	labelhash: `0x${"11".repeat(32)}`,
	resolverBlock: 10n,
	regBlock: 11n,
	kind: "contract",
	version: "1.0.0",
};

function entity(cols: Record<string, unknown>, i: number) {
	const out: Record<string, unknown> = {
		$key: `0x${i.toString(16).padStart(64, "0")}`,
		$creator: registry,
		$owner: registry,
		$createdAt: 5n,
		$expiresAt: 99n,
		$creationFlags: { readonly: true, permissionlessExtension: true, raw: 3 },
	};
	for (const [k, v] of Object.entries(cols)) out[k] = { value: v };
	return out;
}

function fakeReader(pages: unknown[][], skipped = 0, counts?: bigint[]) {
	let n = 0;
	const builder: Record<string, unknown> = {};
	for (const m of [
		"select",
		"from",
		"where",
		"orderBy",
		"limit",
		"offset",
		"withCount",
	]) {
		builder[m] = () => builder;
	}
	builder.fetch = async () => ({
		entities: pages[n++] ?? [],
		blockNumber: 7n,
		skipped,
		count: counts ? (counts[n - 1] ?? 0n) : BigInt(pages.flat().length),
	});
	return builder as unknown as ArkivReader;
}

describe("row validation", () => {
	test("accepts a well-formed release and incident", () => {
		expect(releaseColumns.safeParse(release).success).toBe(true);
		expect(
			incidentColumns.safeParse({
				action: "pull",
				keyRegistry: registry,
				reason: "bad build",
				ensTx: `0x${"22".repeat(32)}`,
				block: 3n,
			}).success,
		).toBe(true);
	});

	test("rejects malformed rows", () => {
		expect(
			releaseColumns.safeParse({ ...release, artifact: "nope" }).success,
		).toBe(false);
		expect(
			releaseColumns.safeParse({ ...release, kind: "delegate" }).success,
		).toBe(false);
		expect(
			incidentColumns.safeParse({
				action: "cut",
				keyRegistry: registry,
				reason: "x".repeat(281),
				ensTx: `0x${"22".repeat(32)}`,
				block: 3n,
			}).success,
		).toBe(false);
	});
});

describe("source", () => {
	test("exposes provenance and drops malformed rows", async () => {
		const src = createArkivSource(
			fakeReader([[entity(release, 1), entity({ ...release, kind: "x" }, 2)]]),
		);
		const res = await src.findReleases(artifact as never);
		expect(res.rows).toHaveLength(1);
		expect(res.malformed).toBe(1);
		expect(res.indexFlooded).toBe(false);
		expect(res.rows[0]?.meta).toMatchObject({
			creator: registry,
			readonly: true,
			permissionlessExtension: true,
			createdBlock: 5n,
			queryBlock: 7n,
		});
	});

	test("flags a flooded index at the page cap", async () => {
		const full = Array.from({ length: 100 }, (_, i) => entity(release, i));
		const src = createArkivSource(fakeReader([full, full, full, full]));
		const res = await src.findReleases(artifact as never, { maxPages: 3 });
		expect(res.rows).toHaveLength(300);
		expect(res.indexFlooded).toBe(true);
	});
});

describe("findReleasesByKeyRegistry", () => {
	test("validates rows and reports completeness", async () => {
		const src = createArkivSource(
			fakeReader([[entity(release, 1), entity({ ...release, kind: "x" }, 2)]]),
		);
		const res = await src.findReleasesByKeyRegistry(registry as never);
		expect(res.rows).toHaveLength(1);
		expect(res.malformed).toBe(1);
		expect(res.incomplete).toBe(false);
		expect(res.indexFlooded).toBe(false);
	});
});

describe("completeness", () => {
	test("full pages with matching count are not flooded", async () => {
		const full = Array.from({ length: 100 }, (_, i) => entity(release, i));
		const src = createArkivSource(fakeReader([full], 0, [100n]));
		const res = await src.findReleases(artifact as never, { maxPages: 1 });
		expect(res.indexFlooded).toBe(false);
		expect(res.incomplete).toBe(false);
	});

	test("a short read against the count is incomplete", async () => {
		const src = createArkivSource(fakeReader([[entity(release, 1)]], 0, [2n]));
		const res = await src.findReleases(artifact as never);
		expect(res.incomplete).toBe(true);
	});

	test("count changing between pages is incomplete", async () => {
		const full = Array.from({ length: 100 }, (_, i) => entity(release, i));
		const src = createArkivSource(
			fakeReader([full, [entity(release, 500)]], 0, [101n, 100n]),
		);
		const res = await src.findReleases(artifact as never);
		expect(res.incomplete).toBe(true);
	});
});

describe("writer validation", () => {
	test("rejects rows the reader would drop", async () => {
		const { createArkivWriter } = await import("../../../cli/arkiv/writer");
		const w = createArkivWriter(`0x${"11".repeat(32)}`, "k");
		const base = { ...release, expiresAt: Date.now() / 1000 + 1000 };
		await expect(
			w.writeRelease({
				...base,
				artifact: `eip155:1:0x${"AB".repeat(20)}`,
			} as never),
		).rejects.toThrow();
		await expect(
			w.writeRelease({ ...base, labelhash: "0x12" } as never),
		).rejects.toThrow();
		await expect(
			w.writeIncident({
				action: "pull",
				keyRegistry: registry,
				reason: "x".repeat(281),
				ensTx: `0x${"22".repeat(32)}`,
				block: 1n,
			} as never),
		).rejects.toThrow();
	});
});

describe("expiry", () => {
	test("caps release deadlines at 182 days", () => {
		const now = Date.UTC(2026, 10, 6);
		const far = releaseDeadline(now / 1000 + 400 * 86400, now);
		expect(far.getTime()).toBe(now + 182 * 86400_000);
		const near = releaseDeadline(now / 1000 + 10 * 86400, now);
		expect(near.getTime()).toBe(now + 10 * 86400_000);
	});
});
