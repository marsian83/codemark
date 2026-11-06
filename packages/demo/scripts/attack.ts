import { mkdir } from "node:fs/promises";
import type { CliContext } from "@codemark/cli/lib/context";
import { deployResolver, saltFor } from "@codemark/cli/lib/factory";
import { toJson } from "@codemark/cli/lib/json";
import { releaseRecordCalls, setAddressCall } from "@codemark/cli/lib/records";
import type { Signer } from "@codemark/cli/lib/signers";
import { confirm, send } from "@codemark/cli/lib/tx";
import { publish } from "@codemark/cli/ops/publish";
import {
	expiryOf,
	publisherRoot,
	registryOf,
} from "@codemark/cli/ops/registries";
import {
	erc1967ImplementationSlot,
	permissionedResolverAbi,
	userRegistryAbi,
} from "@codemark/shared/ens/abi";
import {
	releaseResolverRootRoles,
	resolverRoles,
} from "@codemark/shared/ens/roles";
import {
	contractArtifact,
	forwardLabel,
	releaseName,
} from "@codemark/shared/names";
import { formatRecord } from "@codemark/shared/record";
import {
	type Address,
	concat,
	getAddress,
	type Hex,
	keccak256,
	pad,
	zeroAddress,
} from "viem";
import { env } from "../env";
import { anvil, isAnvil } from "../lib/anvil";
import { forkContext } from "../lib/forkContext";
import { sepoliaTargets } from "../lib/targets";

const url = env.ANVIL_RPC_URL;
if (!(await isAnvil(url))) {
	console.error(`no Anvil fork at ${url}; start one with: bun run fork`);
	process.exit(1);
}
const statePath = env.STATE_DIR;
const seed = await Bun.file(`${statePath}/seed.json`).json();
const publisher: string = seed.publisher.name;
const key = "ci-1";
const run = Math.floor(Date.now() / 1000) % 100_000;

const ctx: CliContext = await forkContext(url, console.log, {
	safe: seed.accounts.root,
});
const node = anvil(url);
const pc = ctx.ens.publicClient;
const ci = ctx.signers.ci as Signer;
const keyRegistry = await registryOf(ctx, `${key}.${publisher}`);
const pubRegistry = await registryOf(ctx, publisher);
const rootAddress = await publisherRoot(ctx, publisher);
const expiry = await expiryOf(ctx, pubRegistry, key);

type Case = {
	name: string;
	label: string;
	target: Address;
	record: string;
	resolver: Address;
	resolverBlock: bigint;
	regBlock: bigint;
	expected: "MISMATCH";
	why: string;
	txs: Record<string, Hex>;
};

async function codehash(address: Address): Promise<Hex> {
	return keccak256((await pc.getCode({ address })) ?? "0x");
}

async function registerRelease(label: string, resolver: Address) {
	return send(ctx, ci, {
		address: keyRegistry,
		abi: userRegistryAbi,
		functionName: "register",
		args: [label, rootAddress, zeroAddress, resolver, 0n, expiry],
	});
}

function names(label: string, target: Address) {
	const fwd = forwardLabel(
		contractArtifact(ctx.ens.deployment.chainId, target),
	);
	return {
		label,
		fwd,
		name: releaseName(publisher, key, label),
		forwardName: releaseName(publisher, key, fwd),
	};
}

async function contractRecord(
	component: string,
	version: string,
	target: Address,
) {
	return formatRecord({
		kind: "contract",
		component,
		chainId: ctx.ens.deployment.chainId,
		codehash: await codehash(target),
		version,
	});
}

async function fakeResolver(): Promise<Case> {
	const target = getAddress(sepoliaTargets.weth);
	const n = names(`router-9-${run}-1`, target);
	const record = await contractRecord("router", `9.${run}.1`, target);
	const genuine = seed.releases.router.resolver as Address;
	const runtime = (await pc.getCode({ address: genuine })) as Hex;
	const length = (runtime.length - 2) / 2;
	const initcode = concat([
		`0x60${length.toString(16).padStart(2, "0")}600c60003960${length.toString(16).padStart(2, "0")}6000f3`,
		runtime,
	]);
	const deployTx = await ci.sendTransaction({ data: initcode });
	const deployed = await confirm(ctx, deployTx);
	const fake = deployed.receipt.contractAddress;
	if (!fake) throw new Error("fake resolver was not created");
	await node.setStorageAt(
		fake,
		erc1967ImplementationSlot,
		pad(ctx.ens.deployment.permissionedResolverImpl),
	);
	const init = await send(ctx, ci, {
		address: fake,
		abi: permissionedResolverAbi,
		functionName: "initialize",
		args: [
			[{ account: rootAddress, roleBitmap: releaseResolverRootRoles }],
			releaseRecordCalls([n.name, n.forwardName], record, target),
		],
	});
	const reg = await registerRelease(n.label, fake);
	return {
		...pick(n),
		target,
		record,
		resolver: fake,
		resolverBlock: init.block,
		regBlock: reg.block,
		expected: "MISMATCH",
		why: "resolver is a copy of a factory proxy at an address VerifiableFactory did not deploy; verifyContract reverts and there is no ProxyDeployed log",
		txs: { deploy: deployTx, initialize: init.hash, register: reg.hash },
	};
}

async function grantWriteRevoke(): Promise<Case> {
	const target = getAddress(sepoliaTargets.router);
	const n = names(`router-9-${run}-2`, target);
	const record = await contractRecord("router", `9.${run}.2`, target);
	const admin = resolverRoles.ROLE_SET_ADDRESS_ADMIN;
	const resolver = await deployResolver(
		ctx,
		ci,
		[
			{ account: rootAddress, roleBitmap: releaseResolverRootRoles },
			{ account: ci.account.address, roleBitmap: admin },
		],
		releaseRecordCalls(
			[n.name, n.forwardName],
			record,
			getAddress(sepoliaTargets.weth),
		),
		saltFor(n.name),
	);
	const reg = await registerRelease(n.label, resolver.address);
	const grant = await send(ctx, ci, {
		address: resolver.address,
		abi: permissionedResolverAbi,
		functionName: "grantRootRoles",
		args: [resolverRoles.ROLE_SET_ADDRESS, ci.account.address],
	});
	const write = await send(ctx, ci, {
		address: resolver.address,
		abi: permissionedResolverAbi,
		functionName: "multicall",
		args: [[setAddressCall(n.name, target)]],
	});
	const revoke = await send(ctx, ci, {
		address: resolver.address,
		abi: permissionedResolverAbi,
		functionName: "revokeRootRoles",
		args: [resolverRoles.ROLE_SET_ADDRESS | admin, ci.account.address],
	});
	return {
		...pick(n),
		target,
		record,
		resolver: resolver.address,
		resolverBlock: resolver.block,
		regBlock: reg.block,
		expected: "MISMATCH",
		why: "the stolen CI key kept ROLE_SET_ADDRESS_ADMIN at init, granted itself ROLE_SET_ADDRESS, rewrote addr from WETH to the router, then revoked both; final roles look clean but EACRolesChanged and AddressUpdated logs follow the creation tx",
		txs: {
			resolver: resolver.hash,
			register: reg.hash,
			grant: grant.hash,
			write: write.hash,
			revoke: revoke.hash,
		},
	};
}

async function upgradeAndRestore(): Promise<Case> {
	const target = getAddress(sepoliaTargets.router);
	const n = names(`router-9-${run}-3`, target);
	const record = await contractRecord("router", `9.${run}.3`, target);
	const upgrade = resolverRoles.ROLE_UPGRADE | resolverRoles.ROLE_UPGRADE_ADMIN;
	const resolver = await deployResolver(
		ctx,
		ci,
		[
			{ account: rootAddress, roleBitmap: releaseResolverRootRoles },
			{ account: ci.account.address, roleBitmap: upgrade },
		],
		releaseRecordCalls([n.name, n.forwardName], record, target),
		saltFor(n.name),
	);
	const reg = await registerRelease(n.label, resolver.address);
	const impl = ctx.ens.deployment.permissionedResolverImpl;
	const away = await send(ctx, ci, {
		address: resolver.address,
		abi: permissionedResolverAbi,
		functionName: "upgradeToAndCall",
		args: [impl, "0x"],
	});
	const back = await send(ctx, ci, {
		address: resolver.address,
		abi: permissionedResolverAbi,
		functionName: "upgradeToAndCall",
		args: [impl, "0x"],
	});
	const renounce = await send(ctx, ci, {
		address: resolver.address,
		abi: permissionedResolverAbi,
		functionName: "revokeRootRoles",
		args: [upgrade, ci.account.address],
	});
	return {
		...pick(n),
		target,
		record,
		resolver: resolver.address,
		resolverBlock: resolver.block,
		regBlock: reg.block,
		expected: "MISMATCH",
		why: "the CI key held ROLE_UPGRADE from init, upgraded the resolver twice and renounced the role; the implementation and roles end clean, but there are extra Upgraded and EACRolesChanged logs (stands in for upgrade-rewrite-restore without custom Solidity)",
		txs: {
			resolver: resolver.hash,
			register: reg.hash,
			upgrade: away.hash,
			restore: back.hash,
			renounce: renounce.hash,
		},
	};
}

async function forgedImplementationSlot(): Promise<Case> {
	const target = getAddress(sepoliaTargets.systemConfigProxy);
	const released = await publish(ctx, {
		publisher,
		key,
		component: "config",
		version: `1.${run}.0`,
		kind: "contract",
		target,
	});
	const forged = getAddress(sepoliaTargets.weth);
	await node.setStorageAt(target, erc1967ImplementationSlot, pad(forged));
	await node.mine();
	return {
		name: released.name,
		label: released.label,
		target,
		record: released.record,
		resolver: released.resolver,
		resolverBlock: released.resolverBlock,
		regBlock: released.regBlock,
		expected: "MISMATCH",
		why: `the proxy's EIP-1967 slot now points at ${forged}, not the published i=${released.recordFields.implementation}`,
		txs: released.txs,
	};
}

async function codehashMismatch(): Promise<Case> {
	const victim = getAddress(sepoliaTargets.router);
	const target = getAddress(sepoliaTargets.weth);
	const n = names(`router-9-${run}-4`, target);
	const record = await contractRecord("router", `9.${run}.4`, victim);
	const resolver = await deployResolver(
		ctx,
		ci,
		[{ account: rootAddress, roleBitmap: releaseResolverRootRoles }],
		releaseRecordCalls([n.name, n.forwardName], record, target),
		saltFor(n.name),
	);
	const reg = await registerRelease(n.label, resolver.address);
	return {
		...pick(n),
		target,
		record,
		resolver: resolver.address,
		resolverBlock: resolver.block,
		regBlock: reg.block,
		expected: "MISMATCH",
		why: "addr points at a contract whose code hash differs from the record's h",
		txs: { resolver: resolver.hash, register: reg.hash },
	};
}

function pick(n: ReturnType<typeof names>) {
	return { name: n.name, label: n.label };
}

const builders = {
	fakeResolver,
	grantWriteRevoke,
	upgradeAndRestore,
	forgedImplementationSlot,
	codehashMismatch,
};
const cases: Record<string, Case | { error: string }> = {};
for (const [id, build] of Object.entries(builders)) {
	try {
		cases[id] = await build();
		console.log(`${id}: ${(cases[id] as Case).name}`);
	} catch (error) {
		cases[id] = { error: String(error).split("\n")[0] ?? "failed" };
		console.error(`${id} failed: ${(cases[id] as { error: string }).error}`);
	}
}

await mkdir(statePath, { recursive: true });
const out = `${statePath}/attack.json`;
await Bun.write(
	out,
	`${toJson({ forkBlock: seed.forkBlock, attackedAtBlock: await pc.getBlockNumber(), publisher, key, keyRegistry, cases })}\n`,
);
console.log(`wrote ${out}`);
