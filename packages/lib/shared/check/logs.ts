import type { AbiEvent, Address, Hex, Log } from "viem";
import type { Ctx } from "./chain";

type Filter = {
	address: Address;
	event?: AbiEvent;
	args?: Record<string, unknown>;
};

export function getLogsRange(
	ctx: Ctx,
	filter: Filter,
	fromBlock: bigint,
	toBlock: bigint,
): Promise<Log[]> {
	return ctx.ens.publicClient.getLogs({
		address: filter.address,
		event: filter.event,
		args: filter.args,
		fromBlock,
		toBlock,
		strict: true,
	} as never) as Promise<Log[]>;
}

const maxBig = (a: bigint, b: bigint) => (a > b ? a : b);
const minBig = (a: bigint, b: bigint) => (a < b ? a : b);
const MIN_SPLIT = 256n;
const FIRST_WINDOW = 1_024n;

export async function getLogsAdaptive(
	ctx: Ctx,
	filter: Filter,
	fromBlock: bigint,
	toBlock: bigint,
): Promise<Log[]> {
	try {
		return await getLogsRange(ctx, filter, fromBlock, toBlock);
	} catch (err) {
		if (toBlock - fromBlock < MIN_SPLIT) throw err;
		const mid = fromBlock + (toBlock - fromBlock) / 2n;
		const low = await getLogsAdaptive(ctx, filter, fromBlock, mid);
		const high = await getLogsAdaptive(ctx, filter, mid + 1n, toBlock);
		return [...low, ...high];
	}
}

export async function scanForward(
	ctx: Ctx,
	filter: Filter,
	fromBlock: bigint,
	toBlock: bigint,
): Promise<Log[]> {
	const out: Log[] = [];
	for (let start = fromBlock; start <= toBlock; start += ctx.chunk) {
		const end = minBig(start + ctx.chunk - 1n, toBlock);
		out.push(...(await getLogsAdaptive(ctx, filter, start, end)));
	}
	return out;
}

export async function scanBackward(
	ctx: Ctx,
	filter: Filter,
	fromBlock: bigint,
	accept: (log: Log) => boolean,
): Promise<Log | undefined> {
	const floor = maxBig(fromBlock - ctx.depth, 0n);
	let window = minBig(FIRST_WINDOW, ctx.chunk);
	for (let end = fromBlock; end >= floor; ) {
		const start = maxBig(end - window + 1n, floor);
		const logs = await getLogsAdaptive(ctx, filter, start, end);
		const hit = logs.reverse().find(accept);
		if (hit) return hit;
		if (start === floor) break;
		end = start - 1n;
		window = minBig(window * 2n, ctx.chunk);
	}
	return undefined;
}

export type LogDigest = { tx: Hex; block: string; topics: Hex[] };

export function digest(log: Log): LogDigest {
	return {
		tx: log.transactionHash as Hex,
		block: String(log.blockNumber),
		topics: [...log.topics] as Hex[],
	};
}

export async function cached<T>(ctx: Ctx, key: string): Promise<T | undefined> {
	if (!ctx.deps.cache) return undefined;
	try {
		return (await ctx.deps.cache.get(`codemark:v1:${key}`)) as T | undefined;
	} catch {
		return undefined;
	}
}

export async function remember(ctx: Ctx, key: string, value: unknown) {
	if (!ctx.deps.cache) return;
	try {
		await ctx.deps.cache.set(`codemark:v1:${key}`, value);
	} catch {}
}
