import {
	type Address,
	decodeEventLog,
	type Hex,
	labelhash,
	toEventSelector,
} from "viem";
import {
	labelRegisteredEvent,
	proxyDeployedEvent,
	resolverUpgradedEvent,
} from "../ens/events";
import {
	coinTypeResource,
	defaultCoinType,
	ROOT_RESOURCE,
	registryRoles,
	textResource,
} from "../ens/roles";
import { labelId } from "../names";
import { recordKey, sepoliaCoinType } from "../record";
import {
	blockTimestamp,
	type Ctx,
	factoryImplementation,
	registry,
	resolver as resolverReads,
	sameAddress,
} from "./chain";
import {
	cached,
	digest,
	getLogsRange,
	type LogDigest,
	remember,
	scanBackward,
	scanForward,
} from "./logs";

export type Blocks = {
	resolverBlock: bigint;
	regBlock: bigint;
	regLabel: string;
};

export type Proof =
	| { ok: true; registeredAt: number; ageSeconds: number }
	| { ok: false; reason: string };

const upgradedTopic = toEventSelector(resolverUpgradedEvent);

const keyRegistryOpenRoles =
	registryRoles.ROLE_REGISTRAR |
	registryRoles.ROLE_UNREGISTER |
	registryRoles.ROLE_RENEW;

function nybbleMask(bitmap: bigint) {
	let mask = 0n;
	for (let i = 0n; i < 256n; i += 4n) if ((bitmap >> i) & 1n) mask |= 0xfn << i;
	return mask;
}

const allNybbles = (1n << 256n) - 1n;

type RoleReader = {
	roleCount: (r: bigint) => Promise<bigint>;
	roles: (r: bigint, a: Address) => Promise<bigint>;
};

export async function rootOnlyRoles(
	read: RoleReader,
	root: Address,
	ignore = 0n,
) {
	const [counts, rootRoles] = await Promise.all([
		read.roleCount(ROOT_RESOURCE),
		read.roles(ROOT_RESOURCE, root),
	]);
	const keep = allNybbles ^ nybbleMask(ignore);
	return (counts & keep) === (rootRoles & keep);
}

export async function soleRootRegistrar(
	ctx: Ctx,
	keyRegistry: Address,
	root: Address,
) {
	const [holds, counts] = await Promise.all([
		registry.hasRootRoles(ctx, keyRegistry, registryRoles.ROLE_REGISTRAR, root),
		registry.roleCount(ctx, keyRegistry, ROOT_RESOURCE),
	]);
	return holds && (counts & 0xfn) === 1n;
}

type ResolverScan = {
	resolverBlock: string;
	creationTx: Hex;
	scannedTo: string;
	logs: LogDigest[];
};

export const CACHE_TAIL_BLOCKS = 12n;

async function creation(ctx: Ctx, res: Address, resolverBlock: bigint) {
	const deployed = await getLogsRange(
		ctx,
		{
			address: ctx.ens.deployment.verifiableFactory,
			event: proxyDeployedEvent,
			args: { proxyAddress: res },
		},
		resolverBlock,
		resolverBlock,
	);
	const log = deployed.find((l) => {
		const { args } = decodeEventLog({
			abi: [proxyDeployedEvent],
			data: l.data,
			topics: l.topics as never,
		});
		return (
			sameAddress(args.proxyAddress, res) &&
			sameAddress(
				args.implementation,
				ctx.ens.deployment.permissionedResolverImpl,
			)
		);
	});
	return log?.transactionHash ?? undefined;
}

async function resolverHistory(ctx: Ctx, res: Address, resolverBlock: bigint) {
	const key = `resolver:${res.toLowerCase()}`;
	const prior = await cached<ResolverScan>(ctx, key);
	let scan: ResolverScan;
	if (prior && prior.resolverBlock === String(resolverBlock)) {
		scan = prior;
	} else {
		const creationTx = await creation(ctx, res, resolverBlock);
		if (!creationTx) return undefined;
		scan = {
			resolverBlock: String(resolverBlock),
			creationTx,
			scannedTo: String(resolverBlock - 1n),
			logs: [],
		};
	}
	const from = BigInt(scan.scannedTo) + 1n;
	let logs = scan.logs;
	if (from <= ctx.block) {
		const fresh = (
			await scanForward(ctx, { address: res }, from, ctx.block)
		).map(digest);
		logs = [...logs, ...fresh];
		const settled = ctx.block - CACHE_TAIL_BLOCKS;
		if (settled >= from) {
			await remember(ctx, key, {
				...scan,
				scannedTo: String(settled),
				logs: logs.filter((l) => BigInt(l.block) <= settled),
			});
		} else if (!prior) {
			await remember(ctx, key, scan);
		}
	}
	return { ...scan, logs: logs.filter((l) => BigInt(l.block) <= ctx.block) };
}

export type StaticInput = {
	res: Address;
	keyRegistry: Address;
	labels: string[];
	root: Address;
	signers?: Address[];
};

type Check = { ok: true } | { ok: false; reason: string };

const VERSION_BITS = 0xffffffffn;

export async function staticProof(
	ctx: Ctx,
	input: StaticInput,
): Promise<Check> {
	const { res, keyRegistry, root } = input;
	const impl = await factoryImplementation(ctx, res);
	if (!impl || !sameAddress(impl, ctx.ens.deployment.permissionedResolverImpl))
		return {
			ok: false,
			reason:
				"the resolver is not a VerifiableFactory PermissionedResolver proxy",
		};
	const resRead: RoleReader = {
		roleCount: (r: bigint) => resolverReads.roleCount(ctx, res, r),
		roles: (r: bigint, a: Address) => resolverReads.roles(ctx, res, r, a),
	};
	const regRead: RoleReader = {
		roleCount: (r: bigint) => registry.roleCount(ctx, keyRegistry, r),
		roles: (r: bigint, a: Address) => registry.roles(ctx, keyRegistry, r, a),
	};
	const recordResources = [
		coinTypeResource(sepoliaCoinType),
		coinTypeResource(defaultCoinType),
		textResource(recordKey),
	];
	const [rootOnResolver, rootOnRegistry, ...counts] = await Promise.all([
		rootOnlyRoles(resRead, root),
		rootOnlyRoles(regRead, root, keyRegistryOpenRoles),
		...recordResources.map((r) => resRead.roleCount(r)),
	]);
	if (!rootOnResolver)
		return {
			ok: false,
			reason: "someone other than the publisher's root holds resolver roles",
		};
	if (!rootOnRegistry)
		return {
			ok: false,
			reason: "someone other than root can change names in the key registry",
		};
	if (counts.some((c) => c !== 0n))
		return {
			ok: false,
			reason: "a record setter role is granted on the release resolver",
		};
	for (const signer of input.signers ?? [])
		if (await holdsDualRoles(ctx, keyRegistry, signer, root))
			return { ok: false, reason: dualKeyReason };
	for (const label of input.labels) {
		const id = labelId(label);
		const [owner, tokenRoles, tokenId] = await Promise.all([
			registry.owner(ctx, keyRegistry, id),
			registry.roleCount(ctx, keyRegistry, id),
			registry.tokenId(ctx, keyRegistry, id),
		]);
		if (!sameAddress(owner, root))
			return {
				ok: false,
				reason: `${label} is not owned by the publisher's root`,
			};
		if (tokenRoles !== 0n)
			return {
				ok: false,
				reason: `${label} carries token roles (reserved or delegated)`,
			};
		if ((tokenId & VERSION_BITS) !== 0n)
			return {
				ok: false,
				reason: `${label} was unregistered or regenerated before this registration (possible revival after a pull)`,
			};
	}
	return { ok: true };
}

export async function proveFromLogs(
	ctx: Ctx,
	input: { res: Address; keyRegistry: Address; blocks: Blocks; root: Address },
): Promise<Proof> {
	const { res, keyRegistry, blocks } = input;
	const history = await resolverHistory(ctx, res, blocks.resolverBlock);
	if (!history)
		return {
			ok: false,
			reason: "no ProxyDeployed log for the resolver at its stated block",
		};
	const foreign = history.logs.filter((l) => l.tx !== history.creationTx);
	if (foreign.length > 0)
		return {
			ok: false,
			reason: "the resolver's records or roles changed after it was created",
		};
	const upgrades = history.logs.filter((l) => l.topics[0] === upgradedTopic);
	if (
		upgrades.length !== 1 ||
		!sameAddress(
			`0x${upgrades[0]?.topics[1]?.slice(-40)}`,
			ctx.ens.deployment.permissionedResolverImpl,
		)
	)
		return { ok: false, reason: "the resolver was upgraded after deployment" };
	return provenAge(ctx, keyRegistry, blocks, input.root);
}

const publishAndPull =
	registryRoles.ROLE_REGISTRAR | registryRoles.ROLE_UNREGISTER;

export const dualKeyReason =
	"a non-root key can both publish and unregister in this key registry";

export async function holdsDualRoles(
	ctx: Ctx,
	keyRegistry: Address,
	account: Address,
	root: Address,
) {
	if (sameAddress(account, root)) return false;
	return registry.hasRootRoles(ctx, keyRegistry, publishAndPull, account);
}

async function provenAge(
	ctx: Ctx,
	keyRegistry: Address,
	blocks: Blocks,
	root: Address,
): Promise<Proof> {
	if (blocks.regBlock > ctx.block)
		return { ok: false, reason: "the registration block is in the future" };
	const [current, logs] = await Promise.all([
		registry.tokenId(ctx, keyRegistry, labelId(blocks.regLabel)),
		getLogsRange(
			ctx,
			{
				address: keyRegistry,
				event: labelRegisteredEvent,
				args: { labelHash: labelhash(blocks.regLabel) },
			},
			blocks.regBlock,
			blocks.regBlock,
		),
	]);
	const hit = logs.find(
		(l) => l.topics[1] !== undefined && BigInt(l.topics[1]) === current,
	);
	if (!hit)
		return {
			ok: false,
			reason: "no registration of the current token at the stated block",
		};
	const sender = `0x${hit.topics[3]?.slice(-40)}` as Address;
	if (await holdsDualRoles(ctx, keyRegistry, sender, root))
		return { ok: false, reason: dualKeyReason };
	const ts = await blockTimestamp(ctx, blocks.regBlock);
	const age = ctx.timestamp - ts;
	return {
		ok: true,
		registeredAt: Number(ts),
		ageSeconds: Number(age < 0n ? 0n : age),
	};
}

export async function findDelegateBlocks(
	ctx: Ctx,
	keyRegistry: Address,
	label: string,
	res: Address,
	root: Address,
): Promise<Blocks | undefined> {
	const key = `delegate:${keyRegistry.toLowerCase()}:${label}:${res.toLowerCase()}`;
	const prior = await cached<{ resolverBlock: string; regBlock: string }>(
		ctx,
		key,
	);
	if (prior && BigInt(prior.regBlock) <= ctx.block)
		return {
			resolverBlock: BigInt(prior.resolverBlock),
			regBlock: BigInt(prior.regBlock),
			regLabel: label,
		};
	const current = await registry.tokenId(ctx, keyRegistry, labelId(label));
	const reg = await scanBackward(
		ctx,
		{
			address: keyRegistry,
			event: labelRegisteredEvent,
			args: { labelHash: labelhash(label) },
		},
		ctx.block,
		(l) => {
			if (l.topics[1] === undefined || BigInt(l.topics[1]) !== current)
				return false;
			return sameAddress(`0x${l.topics[3]?.slice(-40)}`, root);
		},
	);
	if (!reg?.blockNumber) return undefined;
	const dep = await scanBackward(
		ctx,
		{
			address: ctx.ens.deployment.verifiableFactory,
			event: proxyDeployedEvent,
			args: { proxyAddress: res },
		},
		reg.blockNumber,
		() => true,
	);
	if (!dep?.blockNumber) return undefined;
	await remember(ctx, key, {
		resolverBlock: String(dep.blockNumber),
		regBlock: String(reg.blockNumber),
	});
	return {
		resolverBlock: dep.blockNumber,
		regBlock: reg.blockNumber,
		regLabel: label,
	};
}
