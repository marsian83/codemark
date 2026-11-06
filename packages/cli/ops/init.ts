import {
	ethRegistrarAbi,
	mockUsdcAbi,
	userRegistryAbi,
} from "@codemark/shared/ens/abi";
import { ALL_ROLES, registryRoles } from "@codemark/shared/ens/roles";
import { labelId, normalizeLabel } from "@codemark/shared/names";
import {
	type Address,
	encodeFunctionData,
	type Hex,
	parseEventLogs,
	zeroHash,
} from "viem";
import { generatePrivateKey } from "viem/accounts";
import type { CliContext } from "../lib/context";
import { deployRegistry, deployResolver, saltFor } from "../lib/factory";
import { requireRoot } from "../lib/root";
import { requireSigner } from "../lib/signers";
import { send } from "../lib/tx";
import { safeRoot } from "../safe/batch";
import { deploySafe } from "../safe/deploy";
import { now } from "./registries";

export type InitOptions = {
	label: string;
	sec: Address;
	durationSeconds?: bigint;
};

export type InitResult = {
	name: string;
	label: string;
	root: Address;
	owner: Address;
	sec: Address;
	pubRegistry: Address;
	pubRegistryBlock: bigint;
	resolver: Address;
	resolverBlock: bigint;
	tokenId: bigint;
	regBlock: bigint;
	expiry: bigint;
	txs: Record<string, Hex>;
};

export async function initPublisher(
	ctx: CliContext,
	options: InitOptions,
): Promise<InitResult> {
	options = { ...options, label: normalizeLabel(options.label) };
	const owner = requireSigner(ctx.signers, "root");
	const ownerAddress = owner.account.address;
	const root = requireRoot(ctx);
	const rootAddress = root.address;
	const d = ctx.ens.deployment;
	const pc = ctx.ens.publicClient;
	const duration = options.durationSeconds ?? 365n * 24n * 3600n;
	const name = `${options.label}.eth`;

	const available = await pc.readContract({
		address: d.ethRegistrar,
		abi: ethRegistrarAbi,
		functionName: "isAvailable",
		args: [options.label],
	});
	if (!available) throw new Error(`${name} is not available`);

	const resolver = await deployResolver(
		ctx,
		owner,
		[{ account: rootAddress, roleBitmap: ALL_ROLES }],
		[],
		saltFor(`${name}:resolver`),
	);
	ctx.log(`publisher resolver ${resolver.address}`);

	const pubRegistry = await deployRegistry(
		ctx,
		owner,
		[
			{ account: rootAddress, roleBitmap: ALL_ROLES },
			{ account: options.sec, roleBitmap: registryRoles.ROLE_UNREGISTER },
		],
		saltFor(`${name}:registry`),
	);
	ctx.log(`publisher registry ${pubRegistry.address}`);

	const [base, premium] = await pc.readContract({
		address: d.ethRegistrar,
		abi: ethRegistrarAbi,
		functionName: "getRegisterPrice",
		args: [options.label, duration, d.mockUsdc],
	});
	const price = base + premium;
	const balance = await pc.readContract({
		address: d.mockUsdc,
		abi: mockUsdcAbi,
		functionName: "balanceOf",
		args: [ownerAddress],
	});
	if (balance < price)
		await send(ctx, owner, {
			address: d.mockUsdc,
			abi: mockUsdcAbi,
			functionName: "mint",
			args: [ownerAddress, price - balance],
		});
	const approve = await send(ctx, owner, {
		address: d.mockUsdc,
		abi: mockUsdcAbi,
		functionName: "approve",
		args: [d.ethRegistrar, price],
	});

	const secret = generatePrivateKey() as Hex;
	const commitment = await pc.readContract({
		address: d.ethRegistrar,
		abi: ethRegistrarAbi,
		functionName: "makeCommitment",
		args: [
			options.label,
			rootAddress,
			secret,
			pubRegistry.address,
			resolver.address,
			duration,
			zeroHash,
		],
	});
	const commit = await send(ctx, owner, {
		address: d.ethRegistrar,
		abi: ethRegistrarAbi,
		functionName: "commit",
		args: [commitment],
	});
	const minAge = await pc.readContract({
		address: d.ethRegistrar,
		abi: ethRegistrarAbi,
		functionName: "MIN_COMMITMENT_AGE",
	});
	await waitUntil(ctx, (await now(ctx)) + minAge + 1n);

	const register = await send(ctx, owner, {
		address: d.ethRegistrar,
		abi: ethRegistrarAbi,
		functionName: "register",
		args: [
			options.label,
			rootAddress,
			secret,
			pubRegistry.address,
			resolver.address,
			duration,
			d.mockUsdc,
			zeroHash,
		],
	});
	const [registered] = parseEventLogs({
		abi: ethRegistrarAbi,
		eventName: "NameRegistered",
		logs: register.receipt.logs,
	});
	ctx.log(`registered ${name}`);

	const setParent = await root.execute([
		{
			to: pubRegistry.address,
			data: encodeFunctionData({
				abi: userRegistryAbi,
				functionName: "setParent",
				args: [d.ethRegistry, options.label],
			}),
		},
	]);

	const expiry = await pc.readContract({
		address: d.ethRegistry,
		abi: userRegistryAbi,
		functionName: "getExpiry",
		args: [labelId(options.label)],
	});

	return {
		name,
		label: options.label,
		root: rootAddress,
		owner: ownerAddress,
		sec: options.sec,
		pubRegistry: pubRegistry.address,
		pubRegistryBlock: pubRegistry.block,
		resolver: resolver.address,
		resolverBlock: resolver.block,
		tokenId: registered?.args.tokenId ?? 0n,
		regBlock: register.block,
		expiry,
		txs: {
			resolver: resolver.hash,
			pubRegistry: pubRegistry.hash,
			approve: approve.hash,
			commit: commit.hash,
			register: register.hash,
			setParent: setParent.hash,
		},
	};
}

async function waitUntil(ctx: CliContext, timestamp: bigint) {
	const current = await now(ctx);
	if (current >= timestamp) return;
	const seconds = Number(timestamp - current);
	if (ctx.waitSeconds) {
		await ctx.waitSeconds(seconds);
		return;
	}
	ctx.log(`waiting ${seconds}s for the commitment to mature`);
	while ((await now(ctx)) < timestamp) await Bun.sleep(4000);
}

export async function ensureRootSafe(
	ctx: CliContext,
	rpcUrl: string,
	ownerKey: Hex,
): Promise<{ address: Address; created: boolean }> {
	if (ctx.root) return { address: ctx.root.address, created: false };
	const owner = requireSigner(ctx.signers, "root");
	const safe = await deploySafe(ctx, rpcUrl, ownerKey, owner);
	ctx.root = await safeRoot(ctx, rpcUrl, ownerKey, safe.address);
	return { address: safe.address, created: safe.hash !== undefined };
}
