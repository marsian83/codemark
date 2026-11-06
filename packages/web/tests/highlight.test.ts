import { describe, expect, test } from "bun:test";
import { highlight, type Tone } from "../src/pages/landing/code/highlight";

function toneOf(line: string, text: string): Tone | undefined {
	return highlight(line).find((token) => token.text === text)?.tone;
}

describe("highlight", () => {
	test("keeps every character of the line", () => {
		const line = '$ bun cli cut pwnmeswap.eth ci-1 --reason "CI key leaked"';
		expect(
			highlight(line)
				.map((token) => token.text)
				.join(""),
		).toBe(line);
	});

	test("colours a shell command by part", () => {
		const line = '$ bun cli cut pwnmeswap.eth ci-1 --reason "CI key leaked"';
		expect(toneOf(line, "$")).toBe("dim");
		expect(toneOf(line, "pwnmeswap.eth")).toBe("name");
		expect(toneOf(line, "ci-1")).toBe("key");
		expect(toneOf(line, "--reason")).toBe("flag");
		expect(toneOf(line, '"CI key leaked"')).toBe("string");
	});

	test("colours a verified verdict line", () => {
		const line =
			"pwnmeswap.eth · ci-1 · router 3.1.0 · proven · published 3 d ago";
		expect(toneOf(line, "router 3.1.0")).toBe("release");
		expect(toneOf(line, "proven")).toBe("good");
		expect(toneOf(line, "published 3 d ago")).toBe("dim");
	});

	test("marks a revoked verdict as bad", () => {
		expect(
			toneOf("KEY REVOKED by pwnmeswap.eth: CI key leaked", "KEY REVOKED"),
		).toBe("bad");
	});

	test("colours workflow YAML", () => {
		expect(toneOf("    publisher: pwnmeswap.eth", "publisher:")).toBe("field");
		const expression = `\${{ secrets.CODEMARK_CI_KEY }}`;
		expect(toneOf(`    ci-key: ${expression}`, expression)).toBe("key");
		expect(toneOf("- uses: ./.github/actions", "uses:")).toBe("field");
	});
});
