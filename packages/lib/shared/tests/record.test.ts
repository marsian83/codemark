import { describe, expect, test } from "bun:test";
import { contractArtifact, forwardLabel, isValidLabel } from "../names";
import { formatRecord, parseKeys, parseRecord } from "../record";

describe("release record", () => {
	const record = {
		kind: "contract" as const,
		component: "router",
		chainId: 11155111,
		codehash: `0x${"ab".repeat(32)}` as const,
		version: "1.2.0",
		commit: "0123456789abcdef0123456789abcdef01234567",
	};

	test("round-trips through text", () => {
		expect(parseRecord(formatRecord(record))).toEqual(record);
	});

	test("g is optional: omitted when the build commit is unknown", () => {
		const { commit: _commit, ...unknown } = record;
		const text = formatRecord(unknown);
		expect(text).not.toContain("g=");
		expect(parseRecord(text)).toEqual(unknown);
	});

	test("rejects other versions and malformed fields", () => {
		expect(parseRecord("v2;k=contract")).toBeUndefined();
		expect(
			parseRecord("v1;k=contract;n=router;c=abc;v=1;g=00"),
		).toBeUndefined();
	});

	test("key list is trimmed", () => {
		expect(parseKeys("ci-1, ci-2 ,")).toEqual(["ci-1", "ci-2"]);
	});
});

describe("names", () => {
	test("forward label is deterministic and valid", () => {
		const artifact = contractArtifact(
			11155111,
			"0xE03A1074c86CFeDd5C142C4F04F1a1536e203543",
		);
		const label = forwardLabel(artifact);
		expect(label).toMatch(/^a-[0-9a-f]{12}$/);
		expect(forwardLabel(artifact)).toBe(label);
		expect(isValidLabel(label)).toBe(true);
	});

	test("artifact ids are lowercase", () => {
		expect(
			contractArtifact(1, "0xE03A1074c86CFeDd5C142C4F04F1a1536e203543"),
		).toBe("eip155:1:0xe03a1074c86cfedd5c142c4f04f1a1536e203543");
	});
});
