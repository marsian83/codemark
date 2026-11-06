import { env } from "../env";
import { isAnvil, rpc } from "./anvil";

export async function safeForkBlock(): Promise<bigint> {
	if (env.FORK_BLOCK) return env.FORK_BLOCK;
	const head = await rpc<string>(env.SEPOLIA_RPC_URL, "eth_blockNumber");
	return BigInt(head) - 5n;
}

export type SpawnedFork = { url: string; stop: () => void };

export async function spawnFork(
	port: number,
): Promise<SpawnedFork | undefined> {
	const url = `http://127.0.0.1:${port}`;
	let proc: ReturnType<typeof Bun.spawn>;
	try {
		proc = Bun.spawn(
			[
				env.ANVIL_BIN,
				"--fork-url",
				env.SEPOLIA_RPC_URL,
				"--fork-block-number",
				(await safeForkBlock()).toString(),
				"--chain-id",
				"11155111",
				"--port",
				String(port),
				"--silent",
			],
			{ stdout: "ignore", stderr: "pipe" },
		);
	} catch {
		return undefined;
	}
	for (let i = 0; i < 180; i++) {
		if (await isAnvil(url)) return { url, stop: () => proc.kill() };
		if (proc.exitCode !== null) {
			const stderr = proc.stderr as ReadableStream<Uint8Array>;
			console.warn((await new Response(stderr).text()).slice(0, 400));
			return undefined;
		}
		await Bun.sleep(500);
	}
	proc.kill();
	return undefined;
}
