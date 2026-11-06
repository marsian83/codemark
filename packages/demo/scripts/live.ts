import { mkdir } from "node:fs/promises";
import { env as cliEnv } from "@codemark/cli/env";
import { envFilePath, setEnvValue } from "@codemark/cli/lib/envFile";
import { contextFromEnv } from "@codemark/cli/lib/fromEnv";
import { toJson } from "@codemark/cli/lib/json";
import { addKey } from "@codemark/cli/ops/addKey";
import { ensureRootSafe, initPublisher } from "@codemark/cli/ops/init";
import { publish } from "@codemark/cli/ops/publish";
import { ethRegistrarAbi } from "@codemark/shared/ens/abi";
import { normalizeLabel } from "@codemark/shared/names";
import { type Address, formatEther, type Hex } from "viem";
import { env } from "../env";
import { anvil, isAnvil } from "../lib/anvil";
import { sepoliaTargets } from "../lib/targets";

const gasBudget = { root: 14_000_000n, ci: 9_000_000n, sec: 200_000n } as const;
const margin = 2n;

const rpcUrl = cliEnv.SEPOLIA_RPC_URL;
const checkOnly = process.argv.includes("--check");
const label = normalizeLabel(
	process.argv.slice(2).find((a) => !a.startsWith("--")) ??
		env.LIVE_LABEL ??
		"pwnmeswap",
);
const publisher = `${label}.eth`;

for (const name of [
	"CODEMARK_ROOT_KEY",
	"CODEMARK_SEC_KEY",
	"CODEMARK_CI_KEY",
] as const)
	if (!cliEnv[name]) {
		console.error(`${name} is not set in the environment or ${envFilePath}`);
		process.exit(1);
	}

const ctx = await contextFromEnv(rpcUrl);
const pc = ctx.ens.publicClient;
const chainId = await pc.getChainId();
if (chainId !== 11155111) {
	console.error(`RPC is chain ${chainId}, not Sepolia`);
	process.exit(1);
}
const fork = await isAnvil(rpcUrl);
console.log(`${fork ? "Anvil fork of Sepolia" : "Sepolia"} via ${rpcUrl}`);
const statePath = new URL(
	`../state/${fork ? "live.fork.json" : "live.json"}`,
	import.meta.url,
).pathname;

if (fork)
	ctx.waitSeconds = (seconds) =>
		anvil(rpcUrl)
			.increaseTime(seconds)
			.then(() => {});
const quoted = await pc.getGasPrice();
const floor = 1_000_000_000n;
const gasPrice = quoted > floor ? quoted : floor;
const accounts = {
	root: ctx.signers.root?.account.address as Address,
	ci: ctx.signers.ci?.account.address as Address,
	sec: ctx.signers.sec?.account.address as Address,
};
const short: string[] = [];
console.log(
	`gas price ${Number(quoted) / 1e9} gwei, budgeted at ${Number(gasPrice) / 1e9} gwei x ${margin} the gas measured on a fork`,
);
for (const role of ["root", "ci", "sec"] as const) {
	const balance = await pc.getBalance({ address: accounts[role] });
	const needed = gasBudget[role] * gasPrice * margin;
	const ok = balance >= needed;
	if (!ok) short.push(role);
	console.log(
		`  ${role.padEnd(4)} ${accounts[role]}  balance ${formatEther(balance)} ETH  needs ~${formatEther(needed)} ETH  ${ok ? "ok" : "SHORT"}`,
	);
}
const available = await pc.readContract({
	address: ctx.ens.deployment.ethRegistrar,
	abi: ethRegistrarAbi,
	functionName: "isAvailable",
	args: [label],
});
const saved = (await Bun.file(statePath).exists())
	? await Bun.file(statePath).json()
	: {};
const steps: Record<string, unknown> =
	saved.publisherName === publisher ? (saved.steps ?? {}) : {};
console.log(
	`  ${publisher} ${available ? "is available" : steps.publisher ? "already registered by this runbook" : "is NOT available: pass another label"}`,
);
if (short.length > 0) {
	console.error(
		`\nFund ${short.join(", ")} with Sepolia ETH before running. MockUSDC for the .eth registration is minted by the root owner itself. Nothing was sent.`,
	);
	process.exit(1);
}
if (!available && !steps.publisher) process.exit(1);
if (checkOnly) {
	console.log("\nbalance check passed; run without --check to publish");
	process.exit(0);
}

async function save() {
	await mkdir(new URL("../state", import.meta.url).pathname, {
		recursive: true,
	});
	await Bun.write(
		statePath,
		`${toJson({ chainId, rpcUrl, publisherName: publisher, rootSafe: ctx.root?.address, steps })}\n`,
	);
}

async function step<T>(name: string, run: () => Promise<T>): Promise<T> {
	if (steps[name]) {
		console.log(`${name}: done earlier`);
		return steps[name] as T;
	}
	console.log(`${name}...`);
	const result = await run();
	steps[name] = result;
	await save();
	return result;
}

const safe = await step("safe", () =>
	ensureRootSafe(ctx, rpcUrl, cliEnv.CODEMARK_ROOT_KEY as Hex),
);
if (!ctx.root)
	await ensureRootSafe(ctx, rpcUrl, cliEnv.CODEMARK_ROOT_KEY as Hex);
if (!fork && safe.created) await setEnvValue("CODEMARK_SAFE", safe.address);

await step("publisher", () => initPublisher(ctx, { label, sec: accounts.sec }));
await step("ci-1", () =>
	addKey(ctx, { publisher, key: "ci-1", sec: accounts.sec, ci: accounts.ci }),
);
await step("delegates", () =>
	addKey(ctx, { publisher, key: "delegates", sec: accounts.sec }),
);
const common = { publisher };
await step("router", () =>
	publish(ctx, {
		...common,
		key: "ci-1",
		component: "router",
		version: "3.1.0",
		kind: "contract",
		target: sepoliaTargets.router,
	}),
);
await step("portal", () =>
	publish(ctx, {
		...common,
		key: "ci-1",
		component: "portal",
		version: "2.0.0",
		kind: "contract",
		target: sepoliaTargets.portalProxy,
	}),
);
await step("delegate", () =>
	publish(ctx, {
		...common,
		key: "delegates",
		component: "delegate",
		version: "1.0.0",
		kind: "delegate",
		target: sepoliaTargets.delegate,
	}),
);
console.log(`\ndone; ${statePath}`);
