#!/usr/bin/env -S bun --no-env-file
import { createArkivReader } from "@codemark/shared/arkiv/client";
import { createArkivSource } from "@codemark/shared/arkiv/source";
import { createEnsClient } from "@codemark/shared/ens/client";
import {
	parsePublisherName,
	resolvePubRegistry,
} from "@codemark/shared/ens/publisher";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { env } from "./env";
import { createServer } from "./server";

const ens = createEnsClient(env.SEPOLIA_RPC_URL);
const [command, input] = Bun.argv.slice(2);

if (command === "pin") {
	const name = parsePublisherName(input);
	console.log(`${name}=${await resolvePubRegistry(ens, name)}`);
} else if (command) {
	console.error(
		"usage: bunx @marsian/codemark-mcp, or bunx @marsian/codemark-mcp pin <name.eth>",
	);
	process.exit(1);
} else {
	if (env.CODEMARK_PINS.length === 0)
		console.error(
			"CODEMARK_PINS is empty, so no contract can get a proceed. Run: bunx @marsian/codemark-mcp pin <name.eth>",
		);
	const server = createServer({
		ens,
		arkiv: createArkivSource(createArkivReader(env.ARKIV_ACCESS_KEY)),
		pins: env.CODEMARK_PINS,
	});
	await server.connect(new StdioServerTransport());
}
