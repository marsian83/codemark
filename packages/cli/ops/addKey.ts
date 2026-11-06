import {
	permissionedResolverAbi,
	userRegistryAbi,
} from "@codemark/shared/ens/abi";
import { parsePublisherName } from "@codemark/shared/ens/publisher";
import {
	dnsEncode,
	findResolver,
	readText,
} from "@codemark/shared/ens/resolve";
import { ALL_ROLES, registryRoles } from "@codemark/shared/ens/roles";
import { isValidLabel, labelId, normalizeLabel } from "@codemark/shared/names";
import { keysRecordKey, parseKeys } from "@codemark/shared/record";
import {
	type Address,
	encodeFunctionData,
	type Hex,
	isAddressEqual,
	parseEventLogs,
	zeroAddress,
} from "viem";
import type { CliContext } from "../lib/context";
import { deployRegistry, saltFor } from "../lib/factory";
import { type BatchCall, requireRoot } from "../lib/root";
import { requireSigner } from "../lib/signers";
import { now, registryOf } from "./registries";

export type AddKeyOptions = {
	publisher: string;
	key: string;
	sec: Address;
	ci?: Address;
	ttlSeconds?: bigint;
	replaces?: string;
};

export type AddKeyResult = {
	key: string;
	name: string;
	keyRegistry: Address;
	keyRegistryBlock: bigint;
	tokenId: bigint;
	regBlock: bigint;
	linkBlock: bigint;
	expiry: bigint;
	ci?: Address;
	keys: string[];
	txs: Record<string, Hex>;
};

export async function addKey(
	ctx: CliContext,
	options: AddKeyOptions,
): Promise<AddKeyResult> {
	options = {
		...options,
		publisher: parsePublisherName(options.publisher),
		key: normalizeLabel(options.key),
	};
	if (!isValidLabel(options.key))
		throw new Error(`bad key label ${options.key}`);
	const owner = requireSigner(ctx.signers, "root");
	const root = requireRoot(ctx);
	checkCiGrant({
		key: options.key,
		ci: options.ci,
		sec: options.sec,
		owner: owner.account.address,
		root: root.address,
	});
	const name = `${options.key}.${options.publisher}`;
	const pubRegistry = await registryOf(ctx, options.publisher);

	const grants = [
		{ account: root.address, roleBitmap: ALL_ROLES },
		{ account: options.sec, roleBitmap: registryRoles.ROLE_UNREGISTER },
	];
	if (options.ci)
		grants.push({
			account: options.ci,
			roleBitmap: registryRoles.ROLE_REGISTRAR,
		});

	const keyRegistry = await deployRegistry(ctx, owner, grants, saltFor(name));
	ctx.log(`key registry ${keyRegistry.address}`);

	const expiry = (await now(ctx)) + (options.ttlSeconds ?? 90n * 24n * 3600n);
	const keys = await keysCall(ctx, options.publisher, (current) => {
		const kept = current.filter((k) => k !== options.replaces);
		return kept.includes(options.key) ? kept : [...kept, options.key];
	});
	const calls: BatchCall[] = [
		{
			to: keyRegistry.address,
			data: encodeFunctionData({
				abi: userRegistryAbi,
				functionName: "setParent",
				args: [pubRegistry, options.key],
			}),
		},
		{
			to: pubRegistry,
			data: encodeFunctionData({
				abi: userRegistryAbi,
				functionName: "register",
				args: [options.key, root.address, zeroAddress, zeroAddress, 0n, expiry],
			}),
		},
		{
			to: pubRegistry,
			data: encodeFunctionData({
				abi: userRegistryAbi,
				functionName: "setSubregistry",
				args: [labelId(options.key), keyRegistry.address],
			}),
		},
		...(keys.call ? [keys.call] : []),
	];
	const mounted = await root.execute(calls);
	const logs = parseEventLogs({
		abi: userRegistryAbi,
		logs: mounted.receipt.logs,
	});
	const registered = logs.find((l) => l.eventName === "LabelRegistered");
	const linked = logs.find((l) => l.eventName === "SubregistryUpdated");
	if (registered?.eventName !== "LabelRegistered" || !linked)
		throw new Error(`mounting ${name} emitted no link`);
	ctx.log(`registered ${name}`);

	return {
		key: options.key,
		name,
		keyRegistry: keyRegistry.address,
		keyRegistryBlock: keyRegistry.block,
		tokenId: registered.args.tokenId,
		regBlock: mounted.block,
		linkBlock: mounted.block,
		expiry,
		ci: options.ci,
		keys: keys.keys,
		txs: { keyRegistry: keyRegistry.hash, mount: mounted.hash },
	};
}

export async function keysCall(
	ctx: CliContext,
	publisher: string,
	change: (keys: string[]) => string[],
): Promise<{ keys: string[]; call?: BatchCall }> {
	const lookup = await findResolver(ctx.ens, publisher);
	if (lookup.inherited || lookup.resolver === zeroAddress)
		throw new Error(`${publisher} has no resolver of its own`);
	const current = parseKeys(
		await readText(ctx.ens, lookup.resolver, publisher, keysRecordKey),
	);
	const next = change(current);
	if (next.join(",") === current.join(",")) return { keys: current };
	const value = next.join(",");
	if (value.length > 64) throw new Error("codemark.keys exceeds 64 bytes");
	return {
		keys: next,
		call: {
			to: lookup.resolver,
			data: encodeFunctionData({
				abi: permissionedResolverAbi,
				functionName: "setText",
				args: [dnsEncode(publisher), keysRecordKey, value],
			}),
		},
	};
}

const delegateKey = /^delegates(-[0-9]+)?$/;

export function isDelegateKey(key: string): boolean {
	return delegateKey.test(key);
}

export function checkCiGrant(grant: {
	key: string;
	ci?: Address;
	sec: Address;
	owner: Address;
	root: Address;
}) {
	if (!grant.ci) return;
	if (isDelegateKey(grant.key))
		throw new Error(
			`${grant.key} holds account-takeover code: only root may publish under it, so it never gets a CI grant`,
		);
	for (const [name, other] of [
		["sec key", grant.sec],
		["root Safe owner", grant.owner],
		["root Safe", grant.root],
	] as const)
		if (isAddressEqual(grant.ci, other))
			throw new Error(`the CI key must not be the ${name} (${other})`);
}
