import {
	type Abi,
	type Address,
	createTestClient,
	createWalletClient,
	encodeFunctionData,
	type Hex,
	http,
	keccak256,
	publicActions,
	toHex,
	zeroAddress,
} from "viem";
import { sepolia as sepoliaChain } from "viem/chains";
import type {
	ArkivSource,
	Found,
	IncidentColumns,
	ReleaseColumns,
} from "../arkiv/rows";
import { versionLabel } from "../check/binding";
import {
	ethRegistryAbi,
	permissionedResolverAbi,
	userRegistryAbi,
	verifiableFactoryAbi,
} from "../ens/abi";
import { sepolia } from "../ens/addresses";
import type { EnsClient } from "../ens/client";
import { dnsEncode } from "../ens/resolve";
import {
	ALL_ROLES,
	registryRoles,
	releaseResolverRootRoles,
} from "../ens/roles";
import {
	type ArtifactId,
	contractArtifact,
	forwardLabel,
	labelId,
	releaseName,
} from "../names";
import {
	formatRecord,
	keysRecordKey,
	type ReleaseKind,
	recordKey,
	sepoliaCoinType,
} from "../record";

export const forkRpc = process.env.CODEMARK_FORK_RPC ?? "http://127.0.0.1:8546";

export const fork = createTestClient({
	chain: sepoliaChain,
	mode: "anvil",
	transport: http(forkRpc),
	pollingInterval: 50,
}).extend(publicActions);

export async function forkReachable() {
	try {
		return (await fork.getChainId()) === sepolia.chainId;
	} catch {
		return false;
	}
}

export const ensOnFork = (): EnsClient => ({
	chain: sepoliaChain,
	publicClient: fork as unknown as EnsClient["publicClient"],
	deployment: sepolia,
});

const randomHex = (bytes: number) =>
	toHex(crypto.getRandomValues(new Uint8Array(bytes)));

export const randomAddress = () => randomHex(20) as Address;

export async function actor(address = randomAddress()) {
	await fork.impersonateAccount({ address });
	await fork.setBalance({ address, value: 10n ** 20n });
	return address;
}

export async function send(
	from: Address,
	to: Address,
	abi: Abi,
	functionName: string,
	args: readonly unknown[],
) {
	const wallet = createWalletClient({
		chain: sepoliaChain,
		transport: http(forkRpc),
		account: from,
	});
	const hash = await wallet.sendTransaction({
		to,
		data: encodeFunctionData({ abi, functionName, args } as never),
		chain: sepoliaChain,
	} as never);
	const receipt = await fork.waitForTransactionReceipt({ hash });
	if (receipt.status !== "success") throw new Error(`${functionName} reverted`);
	return receipt;
}

async function deployProxy(from: Address, implementation: Address, data: Hex) {
	const salt = BigInt(randomHex(32));
	const address = await fork.readContract({
		address: sepolia.verifiableFactory,
		abi: verifiableFactoryAbi,
		functionName: "predictProxyAddress",
		args: [from, salt],
	});
	const receipt = await send(
		from,
		sepolia.verifiableFactory,
		verifiableFactoryAbi as Abi,
		"deployProxy",
		[implementation, salt, data],
	);
	return { address, block: receipt.blockNumber };
}

type Grant = { account: Address; roleBitmap: bigint };

export function deployRegistry(from: Address, grants: Grant[]) {
	return deployProxy(
		from,
		sepolia.userRegistryImpl,
		encodeFunctionData({
			abi: userRegistryAbi,
			functionName: "initialize",
			args: [grants],
		}),
	);
}

export const setText = (name: string, key: string, value: string) =>
	encodeFunctionData({
		abi: permissionedResolverAbi,
		functionName: "setText",
		args: [dnsEncode(name), key, value],
	});

export const setAddr = (name: string, address: Address) =>
	encodeFunctionData({
		abi: permissionedResolverAbi,
		functionName: "setAddress",
		args: [dnsEncode(name), BigInt(sepoliaCoinType), address],
	});

export function deployResolver(from: Address, grants: Grant[], calls: Hex[]) {
	return deployProxy(
		from,
		sepolia.permissionedResolverImpl,
		encodeFunctionData({
			abi: permissionedResolverAbi,
			functionName: "initialize",
			args: [grants, calls],
		}),
	);
}

const registrationRoles =
	registryRoles.ROLE_SET_SUBREGISTRY |
	registryRoles.ROLE_SET_SUBREGISTRY_ADMIN |
	registryRoles.ROLE_SET_RESOLVER |
	registryRoles.ROLE_SET_RESOLVER_ADMIN |
	registryRoles.ROLE_CAN_TRANSFER_ADMIN;

export async function now() {
	return (await fork.getBlock()).timestamp;
}

export type Key = { label: string; registry: Address; linkBlock: bigint };

export type Publisher = {
	name: string;
	root: Address;
	ci: Address;
	sec: Address;
	pubRegistry: Address;
	keys: Record<string, Key>;
};

async function addKey(
	pub: Omit<Publisher, "keys">,
	label: string,
	grants: Grant[],
): Promise<Key> {
	const expiry = (await now()) + 90n * 86400n;
	const reg = await deployRegistry(pub.root, [
		{ account: pub.root, roleBitmap: ALL_ROLES },
		...grants,
	]);
	await send(pub.root, pub.pubRegistry, userRegistryAbi as Abi, "register", [
		label,
		pub.root,
		zeroAddress,
		zeroAddress,
		0n,
		expiry,
	]);
	const tokenId = await fork.readContract({
		address: pub.pubRegistry,
		abi: userRegistryAbi,
		functionName: "getTokenId",
		args: [labelId(label)],
	});
	const link = await send(
		pub.root,
		pub.pubRegistry,
		userRegistryAbi as Abi,
		"setSubregistry",
		[tokenId, reg.address],
	);
	return { label, registry: reg.address, linkBlock: link.blockNumber };
}

export async function setupPublisher(
	opts: { ciCanUnregister?: boolean } = {},
): Promise<Publisher> {
	const [root, ci, sec] = await Promise.all([actor(), actor(), actor()]);
	const name = `cmk${randomHex(5).slice(2)}.eth`;
	const label = name.split(".")[0] as string;
	const pubResolver = await deployResolver(
		root,
		[{ account: root, roleBitmap: ALL_ROLES }],
		[setText(name, keysRecordKey, "ci-1,delegates")],
	);
	const pubRegistry = await deployRegistry(root, [
		{ account: root, roleBitmap: ALL_ROLES },
		{ account: sec, roleBitmap: registryRoles.ROLE_UNREGISTER },
	]);
	const registrar = await actor(sepolia.ethRegistrar);
	const expiry = (await now()) + 365n * 86400n;
	await send(
		registrar,
		sepolia.ethRegistry,
		ethRegistryAbi as Abi,
		"register",
		[
			label,
			root,
			pubRegistry.address,
			pubResolver.address,
			registrationRoles,
			expiry,
		],
	);
	const base = { name, root, ci, sec, pubRegistry: pubRegistry.address };
	const ci1 = await addKey(base, "ci-1", [
		{
			account: ci,
			roleBitmap: opts.ciCanUnregister
				? registryRoles.ROLE_REGISTRAR | registryRoles.ROLE_UNREGISTER
				: registryRoles.ROLE_REGISTRAR,
		},
		{ account: sec, roleBitmap: registryRoles.ROLE_UNREGISTER },
	]);
	const delegates = await addKey(base, "delegates", [
		{ account: sec, roleBitmap: registryRoles.ROLE_UNREGISTER },
	]);
	return { ...base, keys: { "ci-1": ci1, delegates } };
}

export async function deployTarget() {
	const address = randomAddress();
	await fork.setCode({
		address,
		bytecode: `0x60006000f3${randomHex(8).slice(2)}`,
	});
	return address;
}

export type Release = {
	target: Address;
	artifact: ArtifactId;
	keyLabel: string;
	keyRegistry: Address;
	resolver: Address;
	resolverBlock: bigint;
	regBlock: bigint;
	fwdName: string;
	verName: string;
	version: string;
};

export async function publish(
	pub: Publisher,
	opts: {
		key?: string;
		from?: Address;
		kind?: ReleaseKind;
		version?: string;
		target?: Address;
		extraGrants?: Grant[];
	} = {},
): Promise<Release> {
	const keyLabel = opts.key ?? "ci-1";
	const key = pub.keys[keyLabel] as Key;
	const from = opts.from ?? pub.ci;
	const target = opts.target ?? (await deployTarget());
	const code = await fork.getCode({ address: target });
	const artifact = contractArtifact(sepolia.chainId, target);
	const version = opts.version ?? "3.1.0";
	const component = opts.kind === "delegate" ? "delegate" : "router";
	const record = formatRecord({
		kind: opts.kind ?? "contract",
		component,
		chainId: sepolia.chainId,
		codehash: keccak256(code ?? "0x"),
		version,
		commit: "a".repeat(40),
	});
	const fwdName = releaseName(pub.name, keyLabel, forwardLabel(artifact));
	const verName = releaseName(
		pub.name,
		keyLabel,
		versionLabel(component, version) as string,
	);
	const calls = [fwdName, verName].flatMap((n) => [
		setAddr(n, target),
		setText(n, recordKey, record),
	]);
	const resolver = await deployResolver(
		from,
		[
			{ account: pub.root, roleBitmap: releaseResolverRootRoles },
			...(opts.extraGrants ?? []),
		],
		calls,
	);
	const expiry = (await now()) + 30n * 86400n;
	const regs = [];
	for (const n of [verName, fwdName]) {
		regs.push(
			await send(from, key.registry, userRegistryAbi as Abi, "register", [
				n.split(".")[0],
				pub.root,
				zeroAddress,
				resolver.address,
				0n,
				expiry,
			]),
		);
	}
	return {
		target,
		artifact,
		keyLabel,
		keyRegistry: key.registry,
		resolver: resolver.address,
		resolverBlock: resolver.block,
		regBlock: (regs[0] as { blockNumber: bigint }).blockNumber,
		fwdName,
		verName,
		version,
	};
}

export type Meta = Found<unknown>["meta"];

export function meta(creator: Address, o: Partial<Meta> = {}): Meta {
	return {
		entityKey: randomHex(32),
		creator,
		owner: creator,
		readonly: true,
		permissionlessExtension: true,
		createdBlock: 1n,
		expiresBlock: 10n ** 9n,
		queryBlock: 1n,
		...o,
	};
}

export function releaseRow(
	pub: Publisher,
	rel: Release,
	m: Meta = meta(pub.ci),
): Found<ReleaseColumns> {
	return {
		row: {
			artifact: rel.artifact,
			keyRegistry: rel.keyRegistry,
			publisher: pub.name,
			keyLabel: rel.keyLabel,
			name: rel.verName,
			labelhash: keccak256(toHex(rel.verName.split(".")[0] as string)),
			resolverBlock: rel.resolverBlock,
			regBlock: rel.regBlock,
			kind: "contract",
			version: rel.version,
		},
		meta: m,
	};
}

export class MemoryIndex implements ArkivSource {
	releases: Found<ReleaseColumns>[] = [];
	incidents: Found<IncidentColumns>[] = [];
	down = false;
	private result<T>(rows: Found<T>[], opts?: { maxPages?: number }) {
		if (this.down) throw new Error("index unreachable");
		const limit = (opts?.maxPages ?? 3) * 100;
		return Promise.resolve({
			rows: rows.slice(0, limit),
			indexFlooded: rows.length > limit,
			incomplete: false,
			malformed: 0,
		});
	}
	findReleases(artifact: ArtifactId, opts?: { maxPages?: number }) {
		return this.result(
			this.releases.filter((r) => r.row.artifact === artifact),
			opts,
		);
	}
	findReleasesByKeyRegistry(
		keyRegistry: Address,
		opts?: { maxPages?: number },
	) {
		return this.result(
			this.releases.filter(
				(r) => r.row.keyRegistry.toLowerCase() === keyRegistry.toLowerCase(),
			),
			opts,
		);
	}
	findIncidentsByArtifact(artifact: ArtifactId, opts?: { maxPages?: number }) {
		return this.result(
			this.incidents.filter((r) => r.row.artifact === artifact),
			opts,
		);
	}
	findIncidentsByKeyRegistry(
		keyRegistry: Address,
		opts?: { maxPages?: number },
	) {
		return this.result(
			this.incidents.filter(
				(r) => r.row.keyRegistry.toLowerCase() === keyRegistry.toLowerCase(),
			),
			opts,
		);
	}
}

export class MemoryCache {
	map = new Map<string, unknown>();
	async get(key: string) {
		return this.map.get(key);
	}
	async set(key: string, value: unknown) {
		this.map.set(key, JSON.parse(JSON.stringify(value)));
	}
}

export async function registerBrokenParent() {
	const owner = await actor();
	const label = `evil${randomHex(5).slice(2)}`;
	const registrar = await actor(sepolia.ethRegistrar);
	const expiry = (await now()) + 365n * 86400n;
	await send(
		registrar,
		sepolia.ethRegistry,
		ethRegistryAbi as Abi,
		"register",
		[label, owner, randomAddress(), zeroAddress, registrationRoles, expiry],
	);
	return `${label}.eth`;
}

export function ensDroppingLogsAt(block: bigint): EnsClient {
	const base = ensOnFork();
	const client = base.publicClient;
	const publicClient = new Proxy(client, {
		get(target, prop, receiver) {
			if (prop !== "getLogs") return Reflect.get(target, prop, receiver);
			return async (args: { toBlock?: bigint }) => {
				const logs = (await target.getLogs(args as never)) as {
					blockNumber: bigint | null;
				}[];
				return logs.filter((l) => l.blockNumber !== block);
			};
		},
	});
	return { ...base, publicClient };
}

export async function unregisterLabel(
	registryAddress: Address,
	from: Address,
	label: string,
) {
	const id = await fork.readContract({
		address: registryAddress,
		abi: userRegistryAbi,
		functionName: "getTokenId",
		args: [labelId(label)],
	});
	return send(from, registryAddress, userRegistryAbi as Abi, "unregister", [
		id,
	]);
}

export async function registerLabel(
	registryAddress: Address,
	from: Address,
	label: string,
	owner: Address,
	resolver: Address,
) {
	const expiry = (await now()) + 30n * 86400n;
	return send(from, registryAddress, userRegistryAbi as Abi, "register", [
		label,
		owner,
		zeroAddress,
		resolver,
		0n,
		expiry,
	]);
}
