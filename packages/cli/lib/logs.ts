import type { AbiEvent, Address, Log } from "viem";
import type { CliContext } from "./context";

export async function lastLog<const event extends AbiEvent>(
	ctx: CliContext,
	query: {
		address: Address;
		event: event;
		args?: Record<string, unknown>;
	},
	options: { chunk?: bigint; maxChunks?: number; toBlock?: bigint } = {},
): Promise<Log<bigint, number, false, event, true> | undefined> {
	const pc = ctx.ens.publicClient;
	const chunk = options.chunk ?? 10_000n;
	let to = options.toBlock ?? (await pc.getBlockNumber());
	for (let i = 0; i < (options.maxChunks ?? 50) && to >= 0n; i++) {
		const from = to >= chunk ? to - chunk + 1n : 0n;
		const logs = (await pc.getLogs({
			address: query.address,
			event: query.event,
			args: query.args as never,
			fromBlock: from,
			toBlock: to,
			strict: true,
		})) as Log<bigint, number, false, event, true>[];
		const last = logs[logs.length - 1];
		if (last) return last;
		if (from === 0n) break;
		to = from - 1n;
	}
	return undefined;
}
