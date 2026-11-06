import { expect, test } from "bun:test";
import { join } from "node:path";

const here = import.meta.dir;

// Plain test runs don't freeze built-ins, so they can't catch code that only
// breaks inside MetaMask. viem 2.54 to 2.57 did: assigning `call` to a function
// throws under SES, which took down every check. See patches/viem@2.57.16.patch.
test("the built bundle reaches the network under SES lockdown", async () => {
	const run = Bun.spawn(
		[
			"node",
			join(here, "lockdown-harness.mjs"),
			join(here, "../dist/bundle.js"),
		],
		{ stdout: "pipe", stderr: "pipe" },
	);
	const output = await new Response(run.stdout).text();
	expect(await run.exited).toBe(0);
	const { transaction, pin } = JSON.parse(output);
	const shown = JSON.stringify(transaction.value);
	expect(shown).not.toContain("read only");
	expect(shown).toContain("HTTP request failed");
	expect(pin.thrown).toContain("HTTP request failed");
}, 60_000);
