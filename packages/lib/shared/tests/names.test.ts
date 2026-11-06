import { describe, expect, test } from "bun:test";
import { parsePublisherName } from "../ens/publisher";
import {
	isNormalized,
	isValidLabel,
	normalizeLabel,
	normalizeName,
	releaseName,
} from "../names";

describe("ENSIP-15 normalisation", () => {
	test("mixed case and full-width input normalise to the canonical name", () => {
		expect(normalizeName(" PwnmeSwap.ETH ")).toBe("pwnmeswap.eth");
		expect(normalizeLabel("ＲＯＵＴＥＲ")).toBe("router");
		expect(parsePublisherName("PwnmeSwap.eth")).toBe("pwnmeswap.eth");
		expect(releaseName("PwnmeSwap.eth", "CI-1", "Router-3-1-0")).toBe(
			"router-3-1-0.ci-1.pwnmeswap.eth",
		);
	});

	test("labels that are not already normalised are not valid codemark labels", () => {
		expect(isValidLabel("router-3-1-0")).toBe(true);
		expect(isValidLabel("Router-3-1-0")).toBe(false);
		expect(isValidLabel("ｒouter")).toBe(false);
		expect(isNormalized("pwnmeswap.eth")).toBe(true);
		expect(isNormalized("PwnmeSwap.eth")).toBe(false);
	});

	test("invalid names are rejected, not passed through", () => {
		for (const bad of ["xn--abc.eth", "a..eth", "ab_c.eth", "", "eth"])
			expect(() => parsePublisherName(bad)).toThrow();
		expect(() => normalizeLabel("ci-1.pwnmeswap")).toThrow(/single label/);
	});

	test("a lookalike that mixes scripts is rejected, not matched to the real name", () => {
		expect(() => parsePublisherName("pwnmeswаp.eth")).toThrow(/Cyrillic/);
		expect(isValidLabel("pwnmeswаp")).toBe(false);
	});

	test("normalised unicode publisher names are accepted", () => {
		expect(parsePublisherName("Café.eth")).toBe("café.eth");
	});
});
