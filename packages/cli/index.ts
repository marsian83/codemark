#!/usr/bin/env bun
import { parseArgs } from "node:util";
import { commands } from "./commands";

const { positionals, values } = parseArgs({
	args: Bun.argv.slice(2),
	allowPositionals: true,
	strict: false,
	options: {
		...Object.fromEntries(
			[
				"rpc",
				"sec",
				"ci",
				"years",
				"ttl-days",
				"kind",
				"target",
				"component",
				"version",
				"commit",
				"forward",
				"reason",
				"link-block",
				"replaces",
				"role",
				"pin",
				"block",
				"min-age",
				"from-block",
			].map((name) => [name, { type: "string" as const }]),
		),
		"root-only": { type: "boolean" },
		"no-index": { type: "boolean" },
		json: { type: "boolean" },
	},
});

const [name, ...rest] = positionals;
const command = name ? commands[name] : undefined;

if (!command) {
	console.log(`codemark <command>\n\n${Object.keys(commands).join("\n")}`);
	process.exit(name ? 1 : 0);
}

try {
	await command(rest, values);
} catch (error) {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
}
