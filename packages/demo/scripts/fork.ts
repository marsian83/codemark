import { env } from "../env";
import { safeForkBlock } from "../lib/spawnFork";

const port = new URL(env.ANVIL_RPC_URL).port || "8545";

const proc = Bun.spawn(
	[
		env.ANVIL_BIN,
		"--fork-url",
		env.SEPOLIA_RPC_URL,
		"--fork-block-number",
		(await safeForkBlock()).toString(),
		"--chain-id",
		"11155111",
		"--port",
		port,
		...process.argv.slice(2),
	],
	{ stdout: "inherit", stderr: "inherit" },
);
await proc.exited;
