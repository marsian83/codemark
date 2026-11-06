import { userRegistryAbi } from "@codemark/shared/ens/abi";
import { parsePublisherName } from "@codemark/shared/ens/publisher";
import { readAddr, readText } from "@codemark/shared/ens/resolve";
import { nybbleCount, registryRoles } from "@codemark/shared/ens/roles";
import {
	contractArtifact,
	forwardLabel,
	labelId,
	normalizeLabel,
	releaseName,
} from "@codemark/shared/names";
import {
	parseRecord,
	recordKey,
	sepoliaCoinType,
} from "@codemark/shared/record";
import {
	type Address,
	getAbiItem,
	getAddress,
	labelhash,
	size,
	zeroAddress,
} from "viem";
import type { CliContext } from "../lib/context";
import { lastLog } from "../lib/logs";
import { type AddKeyResult, addKey } from "./addKey";
import { type PublishResult, publish } from "./publish";
import { registryOf } from "./registries";

export type MigrateOptions = {
	publisher: string;
	oldKey: string;
	newKey: string;
	sec: Address;
	ci?: Address;
	fromBlock?: bigint;
};

export type MigrateResult = {
	oldKeyRegistry: Address;
	key: AddKeyResult | { keyRegistry: Address; existing: true };
	republished: PublishResult[];
	skipped: { label: string; reason: string }[];
};

const registered = getAbiItem({
	abi: userRegistryAbi,
	name: "LabelRegistered",
});
const linked = getAbiItem({ abi: userRegistryAbi, name: "SubregistryUpdated" });

async function scan<T>(
	ctx: CliContext,
	fromBlock: bigint,
	read: (from: bigint, to: bigint) => Promise<T[]>,
): Promise<T[]> {
	const head = await ctx.ens.publicClient.getBlockNumber();
	const out: T[] = [];
	for (let from = fromBlock; from <= head; from += 10_000n) {
		let to = from + 9_999n;
		if (to > head) to = head;
		out.push(...(await read(from, to)));
	}
	return out;
}

export async function oldKeyRegistry(
	ctx: CliContext,
	publisher: string,
	key: string,
): Promise<{ registry: Address; linkBlock: bigint }> {
	const pc = ctx.ens.publicClient;
	const pubRegistry = await registryOf(ctx, publisher);
	const live = await pc.readContract({
		address: pubRegistry,
		abi: userRegistryAbi,
		functionName: "getSubregistry",
		args: [key],
	});
	const deep = { maxChunks: 400 };
	let link: Awaited<ReturnType<typeof lastLog<typeof linked>>>;
	if (live !== zeroAddress) {
		link = await lastLog(
			ctx,
			{ address: pubRegistry, event: linked, args: { subregistry: live } },
			deep,
		);
	} else {
		const reg = await lastLog(
			ctx,
			{
				address: pubRegistry,
				event: registered,
				args: { labelHash: labelhash(key) },
			},
			deep,
		);
		if (!reg) throw new Error(`${key}.${publisher} was never registered`);
		link = await lastLog(
			ctx,
			{
				address: pubRegistry,
				event: linked,
				args: { tokenId: reg.args.tokenId },
			},
			deep,
		);
	}
	if (!link)
		throw new Error(`no registry was ever linked at ${key}.${publisher}`);
	return { registry: link.args.subregistry, linkBlock: link.blockNumber };
}

export async function migrate(
	ctx: CliContext,
	options: MigrateOptions,
): Promise<MigrateResult> {
	options = {
		...options,
		publisher: parsePublisherName(options.publisher),
		oldKey: normalizeLabel(options.oldKey),
		newKey: normalizeLabel(options.newKey),
	};
	const pc = ctx.ens.publicClient;
	const old = await oldKeyRegistry(ctx, options.publisher, options.oldKey);
	const oldRegistry = old.registry;
	const fromBlock = options.fromBlock ?? old.linkBlock;
	const [counts] = await pc.readContract({
		address: oldRegistry,
		abi: userRegistryAbi,
		functionName: "getAssigneeCount",
		args: [0n, registryRoles.ROLE_REGISTRAR],
	});
	checkMigrationGrant(
		options.oldKey,
		nybbleCount(counts, registryRoles.ROLE_REGISTRAR) <= 1,
		options.ci,
	);
	const labels = [
		...new Set(
			(
				await scan(ctx, fromBlock, (from, to) =>
					pc.getLogs({
						address: oldRegistry,
						event: registered,
						fromBlock: from,
						toBlock: to,
					}),
				)
			)
				.map((log) => log.args.label)
				.filter((label): label is string => !!label && !label.startsWith("a-")),
		),
	];

	const existing = await registryOf(
		ctx,
		`${options.newKey}.${options.publisher}`,
	).catch(() => undefined);
	const key: AddKeyResult | { keyRegistry: Address; existing: true } = existing
		? { keyRegistry: existing, existing: true }
		: await addKey(ctx, {
				publisher: options.publisher,
				key: options.newKey,
				sec: options.sec,
				ci: options.ci,
				replaces: options.oldKey,
			});

	const republished: PublishResult[] = [];
	const skipped: MigrateResult["skipped"] = [];
	for (const label of labels) {
		const status = await pc.readContract({
			address: oldRegistry,
			abi: userRegistryAbi,
			functionName: "getStatus",
			args: [labelId(label)],
		});
		const resolver = await pc.readContract({
			address: oldRegistry,
			abi: userRegistryAbi,
			functionName: "getResolver",
			args: [label],
		});
		if (status !== 2 || resolver === zeroAddress) {
			skipped.push({
				label,
				reason: "not live under the old key (pulled or expired)",
			});
			continue;
		}
		const oldName = releaseName(options.publisher, options.oldKey, label);
		const record = parseRecord(
			await readText(ctx.ens, resolver, oldName, recordKey),
		);
		const addr = await readAddr(ctx.ens, resolver, oldName, sepoliaCoinType);
		if (!record || record.kind === "web" || size(addr) !== 20) {
			skipped.push({ label, reason: "no contract record to republish" });
			continue;
		}
		const target = getAddress(addr);
		const fwd = forwardLabel(
			contractArtifact(ctx.ens.deployment.chainId, target),
		);
		const current = await pc.readContract({
			address: oldRegistry,
			abi: userRegistryAbi,
			functionName: "getResolver",
			args: [fwd],
		});
		if (current !== resolver) {
			skipped.push({
				label,
				reason: `${fwd} points at another release of this artifact`,
			});
			continue;
		}
		const newStatus = await pc.readContract({
			address: key.keyRegistry,
			abi: userRegistryAbi,
			functionName: "getStatus",
			args: [labelId(label)],
		});
		if (newStatus !== 0) {
			skipped.push({ label, reason: "already present under the new key" });
			continue;
		}
		const isDelegate = record.kind === "delegate";
		if (isDelegate !== (options.ci === undefined)) {
			skipped.push({
				label,
				reason: isDelegate
					? "delegates are republished only under a root-only key"
					: "contracts are republished only under a key with a CI grant",
			});
			continue;
		}
		republished.push(
			await publish(ctx, {
				publisher: options.publisher,
				key: options.newKey,
				component: record.component,
				version: record.version,
				kind: record.kind,
				target,
				commit: record.commit,
			}),
		);
	}
	return { oldKeyRegistry: oldRegistry, key, republished, skipped };
}

export function checkMigrationGrant(
	oldKey: string,
	oldRootOnly: boolean,
	ci: Address | undefined,
) {
	if (oldRootOnly && ci)
		throw new Error(
			`${oldKey} was root-only (no CI held ROLE_REGISTRAR); its replacement must be too: pass --root-only`,
		);
	if (!oldRootOnly && !ci)
		throw new Error(`${oldKey} had a CI grant; pass --ci <new CI address>`);
}
