import type { CheckCache, Pin } from "@codemark/shared/check/types";
import type { Address } from "viem";

export type StoredPin = Pin & { pinnedAt: number };

export type SnapState = {
	pins: StoredPin[];
	cache: Record<string, { at: number; value: string }>;
};

const maxCacheEntries = 200;

function replacer(_k: string, v: unknown) {
	return typeof v === "bigint" ? { $big: v.toString() } : v;
}

function reviver(_k: string, v: unknown) {
	if (v && typeof v === "object" && "$big" in v) {
		return BigInt((v as { $big: string }).$big);
	}
	return v;
}

export async function loadState(): Promise<SnapState> {
	const raw = (await snap.request({
		method: "snap_manageState",
		params: { operation: "get" },
	})) as Partial<SnapState> | null;
	return { pins: raw?.pins ?? [], cache: raw?.cache ?? {} };
}

let queue: Promise<unknown> = Promise.resolve();

function serialized<T>(job: () => Promise<T>): Promise<T> {
	const run = queue.then(job, job);
	queue = run.catch(() => undefined);
	return run;
}

async function write(state: SnapState) {
	await snap.request({
		method: "snap_manageState",
		params: {
			operation: "update",
			newState: state as unknown as Record<string, never>,
		},
	});
}

export function updatePins(change: (pins: StoredPin[]) => StoredPin[]) {
	return serialized(async () => {
		const fresh = await loadState();
		fresh.pins = change(fresh.pins);
		await write(fresh);
		return fresh.pins;
	});
}

export function createCache(state: SnapState): CheckCache {
	return {
		async get(key) {
			const hit = state.cache[key];
			return hit ? JSON.parse(hit.value, reviver) : undefined;
		},
		async set(key, value) {
			const entry = { at: Date.now(), value: JSON.stringify(value, replacer) };
			state.cache[key] = entry;
			await serialized(async () => {
				const fresh = await loadState();
				fresh.cache[key] = entry;
				const keys = Object.keys(fresh.cache);
				if (keys.length > maxCacheEntries) {
					const oldest = keys.sort(
						(a, b) => (fresh.cache[a]?.at ?? 0) - (fresh.cache[b]?.at ?? 0),
					);
					for (const k of oldest.slice(0, keys.length - maxCacheEntries)) {
						delete fresh.cache[k];
					}
				}
				await write(fresh);
			});
		},
	};
}

export function samePin(a: { pubRegistry: Address }, b: Address) {
	return a.pubRegistry.toLowerCase() === b.toLowerCase();
}
