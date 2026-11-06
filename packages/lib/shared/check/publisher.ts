import type { Address } from "viem";
import { liveRootRegistry } from "../ens/deployment";
import { labelId } from "../names";
import { keysRecordKey, parseKeys } from "../record";
import {
	type Ctx,
	isRevert,
	isZero,
	lookupResolver,
	memo,
	registry,
	sameAddress,
	textViaUniversal,
} from "./chain";

export type Publisher = {
	name: string;
	pubRegistry?: Address;
	root?: Address;
	keys: string[];
};

async function parentRegistry(ctx: Ctx, parentName: string) {
	let current: Address = await memo(ctx, "root", () =>
		liveRootRegistry(ctx.ens, ctx.block),
	);
	for (const label of parentName.split(".").reverse()) {
		const next = await registry.subregistry(ctx, current, label);
		if (isZero(next)) return undefined;
		current = next;
	}
	return current;
}

async function readKeys(ctx: Ctx, name: string, own: Address) {
	const found = await lookupResolver(ctx, name);
	if (isZero(found.resolver) || found.offset !== 0n) return [];
	try {
		const { value, resolver } = await textViaUniversal(
			ctx,
			name,
			keysRecordKey,
		);
		if (!sameAddress(resolver, found.resolver)) return [];
		const keys = parseKeys(value).slice(0, 16);
		const live: string[] = [];
		for (const key of keys) {
			if (!isZero(await registry.subregistry(ctx, own, key))) live.push(key);
		}
		return live;
	} catch (err) {
		if (isRevert(err)) return [];
		throw err;
	}
}

export function loadPublisher(ctx: Ctx, name: string): Promise<Publisher> {
	return memo(ctx, `pub:${name}`, () =>
		readPublisher(ctx, name).catch((err) => {
			if (isRevert(err)) return { name, keys: [] };
			throw err;
		}),
	);
}

async function readPublisher(ctx: Ctx, name: string): Promise<Publisher> {
	const dot = name.indexOf(".");
	if (dot <= 0) return { name, keys: [] };
	const parent = await parentRegistry(ctx, name.slice(dot + 1));
	if (!parent) return { name, keys: [] };
	const label = name.slice(0, dot);
	const [pubRegistry, root] = await Promise.all([
		registry.subregistry(ctx, parent, label),
		registry.owner(ctx, parent, labelId(label)),
	]);
	if (isZero(pubRegistry) || isZero(root)) return { name, keys: [] };
	return {
		name,
		pubRegistry,
		root,
		keys: await readKeys(ctx, name, pubRegistry),
	};
}
