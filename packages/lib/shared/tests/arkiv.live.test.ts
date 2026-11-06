import { describe, expect, test } from "bun:test";
import { createArkivReader } from "../arkiv/client";
import { createArkivSource } from "../arkiv/source";
import { contractArtifact } from "../names";

const key = process.env.ARKIV_ACCESS_KEY;
const t = key ? test : test.skip;

describe("rabdi live", () => {
	if (!key) console.warn("ARKIV_ACCESS_KEY not set: live Rabdi tests skipped");

	t("query for an unknown artifact returns no rows", async () => {
		const src = createArkivSource(createArkivReader(key));
		const res = await src.findReleases(
			contractArtifact(11155111, `0x${"00".repeat(20)}`),
		);
		expect(res.rows).toEqual([]);
		expect(res.indexFlooded).toBe(false);
	});

	t("incident query by key registry works", async () => {
		const src = createArkivSource(createArkivReader(key));
		const res = await src.findIncidentsByKeyRegistry(`0x${"00".repeat(20)}`);
		expect(res.rows).toEqual([]);
	});
});
