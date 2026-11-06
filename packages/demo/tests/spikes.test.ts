import {
	afterAll,
	beforeAll,
	describe,
	expect,
	setDefaultTimeout,
	test,
} from "bun:test";
import type { CliContext } from "@codemark/cli/lib/context";
import type { RootExecutor } from "@codemark/cli/lib/root";
import type { Signer } from "@codemark/cli/lib/signers";
import { addKey } from "@codemark/cli/ops/addKey";
import { cut } from "@codemark/cli/ops/cut";
import { initPublisher } from "@codemark/cli/ops/init";
import { type PublishResult, publish } from "@codemark/cli/ops/publish";
import { pull, reservedExpiry } from "@codemark/cli/ops/pull";
import { now } from "@codemark/cli/ops/registries";
import { userRegistryAbi } from "@codemark/shared/ens/abi";
import { findResolver, readText } from "@codemark/shared/ens/resolve";
import { registryRoles } from "@codemark/shared/ens/roles";
import { labelId } from "@codemark/shared/names";
import {
	type Address,
	encodeFunctionData,
	type Hex,
	parseEventLogs,
	zeroAddress,
} from "viem";
import { anvil, isAnvil } from "../lib/anvil";
import { forkContext } from "../lib/forkContext";
import { revertName } from "../lib/revert";
import { spawnFork } from "../lib/spawnFork";
import { sepoliaTargets } from "../lib/targets";

const fork = process.env.SPIKE_RPC_URL
	? undefined
	: await spawnFork(Number(process.env.SPIKE_PORT ?? 18545));
const url = process.env.SPIKE_RPC_URL ?? fork?.url ?? "";
const reachable = url !== "" && (await isAnvil(url));
if (!reachable)
	console.warn(
		"spikes skipped: could not start Anvil (ANVIL_BIN) forking SEPOLIA_RPC_URL",
	);

setDefaultTimeout(60_000);

describe.skipIf(!reachable)("spike 1 and 2 on an Anvil fork", () => {
	let ctx: CliContext;
	let snapshot: Hex;
	let root: Address;
	let sec: Signer;
	let ci: Signer;
	let publisher: string;
	let keyRegistry: Address;
	let pubRegistry: Address;
	let router: PublishResult;
	let second: PublishResult;

	const simulate = (
		signer: Signer,
		address: Address,
		functionName: "register" | "unregister",
		args: readonly unknown[],
	) =>
		ctx.ens.publicClient.simulateContract({
			account: signer.account,
			address,
			abi: userRegistryAbi,
			functionName,
			args,
		} as never);

	const write = async (
		signer: Signer,
		address: Address,
		functionName: "register" | "unregister",
		args: readonly unknown[],
	) => {
		const { request } = await simulate(signer, address, functionName, args);
		const hash = await signer.writeContract(request as never);
		return ctx.ens.publicClient.waitForTransactionReceipt({ hash });
	};

	const tokenOf = (label: string) =>
		ctx.ens.publicClient.readContract({
			address: keyRegistry,
			abi: userRegistryAbi,
			functionName: "getTokenId",
			args: [labelId(label)],
		});

	beforeAll(async () => {
		snapshot = await anvil(url).snapshot();
		ctx = await forkContext(url, () => {});
		root = (ctx.root as RootExecutor).address;
		sec = ctx.signers.sec as Signer;
		ci = ctx.signers.ci as Signer;
		const label = `spike${Date.now().toString(36)}`;
		publisher = `${label}.eth`;
		const init = await initPublisher(ctx, {
			label,
			sec: sec.account.address,
		});
		pubRegistry = init.pubRegistry;
		const key = await addKey(ctx, {
			publisher,
			key: "ci-1",
			sec: sec.account.address,
			ci: ci.account.address,
		});
		keyRegistry = key.keyRegistry;
		const base = {
			publisher,
			key: "ci-1",
			component: "router",
			kind: "contract" as const,
		};
		router = await publish(ctx, {
			...base,
			version: "3.1.0",
			target: sepoliaTargets.router,
		});
		second = await publish(ctx, {
			...base,
			version: "3.1.1",
			target: sepoliaTargets.weth,
		});
	}, 120_000);

	afterAll(async () => {
		if (fork) fork.stop();
		else if (snapshot) await anvil(url).revert(snapshot);
	});

	test("root is a Safe that owns the publisher name; its owner EOA holds no registry role", async () => {
		const code = await ctx.ens.publicClient.getCode({ address: root });
		expect(code && code.length > 2).toBe(true);
		const owner = (ctx.signers.root as Signer).account.address;
		for (const [address, expected] of [
			[root, true],
			[owner, false],
		] as const)
			expect(
				await ctx.ens.publicClient.readContract({
					address: pubRegistry,
					abi: userRegistryAbi,
					functionName: "hasRootRoles",
					args: [registryRoles.ROLE_UNREGISTER, address],
				}),
			).toBe(expected);
	});

	test("CI key registered a release that resolves at offset 0", async () => {
		const found = await findResolver(ctx.ens, router.name);
		expect(found.offset).toBe(0n);
		expect(found.resolver).toBe(router.resolver);
		expect(
			await readText(ctx.ens, found.resolver, router.name, "codemark"),
		).toBe(router.record);
		const fwd = await findResolver(ctx.ens, router.forwardName);
		expect(fwd.offset).toBe(0n);
		expect(router.regBlock).toBe(router.forwardRegBlock);
	});

	test("CI key cannot unregister", async () => {
		expect(
			await revertName(
				simulate(ci, keyRegistry, "unregister", [await tokenOf(router.label)]),
			),
		).toBe("EACUnauthorizedAccountRoles");
	});

	test("CI key cannot overwrite a live label", async () => {
		expect(
			await revertName(
				simulate(ci, keyRegistry, "register", [
					router.label,
					ci.account.address,
					zeroAddress,
					zeroAddress,
					0n,
					router.expiry,
				]),
			),
		).toBe("LabelAlreadyRegistered");
	});

	test("sec key cannot register", async () => {
		expect(
			await revertName(
				simulate(sec, keyRegistry, "register", [
					"sec-attempt",
					sec.account.address,
					zeroAddress,
					zeroAddress,
					0n,
					router.expiry,
				]),
			),
		).toBe("EACUnauthorizedAccountRoles");
	});

	test("sec key can unregister; CI can re-register in the window before root reserves", async () => {
		const expiry = (await now(ctx)) + 86_400n;
		await write(ci, keyRegistry, "register", [
			"window-1-0-0",
			root,
			zeroAddress,
			zeroAddress,
			0n,
			expiry,
		]);
		const receipt = await write(sec, keyRegistry, "unregister", [
			await tokenOf("window-1-0-0"),
		]);
		expect(receipt.status).toBe("success");
		expect(
			await revertName(
				simulate(ci, keyRegistry, "register", [
					"window-1-0-0",
					root,
					zeroAddress,
					zeroAddress,
					0n,
					expiry,
				]),
			),
		).toBe("ok");
	});

	test("root pull reserves both names; findResolver offset != 0 after pull", async () => {
		const pulled = await pull(ctx, {
			publisher,
			key: "ci-1",
			label: router.label,
			reason: "spike",
		});
		expect(pulled.labels.map((l) => l.label)).toEqual([
			router.label,
			router.forwardLabel,
		]);
		for (const name of [router.name, router.forwardName]) {
			const found = await findResolver(ctx.ens, name);
			expect(found.offset).not.toBe(0n);
		}
		const receipt = await ctx.ens.publicClient.getTransactionReceipt({
			hash: pulled.ensTx,
		});
		const events = parseEventLogs({ abi: userRegistryAbi, logs: receipt.logs });
		expect(
			events.filter((e) => e.eventName === "LabelUnregistered"),
		).toHaveLength(2);
		expect(events.filter((e) => e.eventName === "LabelReserved")).toHaveLength(
			2,
		);
	});

	test("CI key cannot register a reserved label; sec can clear it", async () => {
		expect(
			await revertName(
				simulate(ci, keyRegistry, "register", [
					router.label,
					root,
					zeroAddress,
					router.resolver,
					0n,
					router.expiry,
				]),
			),
		).toBe("EACUnauthorizedAccountRoles");
		expect(
			await revertName(
				simulate(sec, keyRegistry, "unregister", [
					await tokenOf(router.forwardLabel),
				]),
			),
		).toBe("ok");
	});

	test("root promotion of a reserved label carries ROLE_WAS_RESERVED", async () => {
		await (ctx.root as RootExecutor).execute([
			{
				to: keyRegistry,
				data: encodeFunctionData({
					abi: userRegistryAbi,
					functionName: "register",
					args: [router.label, root, zeroAddress, router.resolver, 0n, 0n],
				}),
			},
		]);
		const roles = await ctx.ens.publicClient.readContract({
			address: keyRegistry,
			abi: userRegistryAbi,
			functionName: "roles",
			args: [await tokenOf(router.label), root],
		});
		expect(roles & registryRoles.ROLE_WAS_RESERVED).toBe(
			registryRoles.ROLE_WAS_RESERVED,
		);
		const expiry = await ctx.ens.publicClient.readContract({
			address: keyRegistry,
			abi: userRegistryAbi,
			functionName: "getExpiry",
			args: [labelId(router.label)],
		});
		expect(expiry).toBe(reservedExpiry);
	});

	test("cut: sec unregisters the key; releases under it resolve at offset != 0", async () => {
		const before = await findResolver(ctx.ens, second.name);
		expect(before.offset).toBe(0n);
		const result = await cut(ctx, {
			publisher,
			key: "ci-1",
			reason: "spike",
		});
		expect(result.keyRegistry).toBe(keyRegistry);
		for (const name of [second.name, second.forwardName]) {
			const found = await findResolver(ctx.ens, name);
			expect(found.offset).not.toBe(0n);
		}
		const live = await ctx.ens.publicClient.readContract({
			address: pubRegistry,
			abi: userRegistryAbi,
			functionName: "getSubregistry",
			args: ["ci-1"],
		});
		expect(live).toBe(zeroAddress);
	});
});
