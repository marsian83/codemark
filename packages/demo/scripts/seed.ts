import { mkdir } from "node:fs/promises";
import { createArkivWriters } from "@codemark/cli/lib/arkiv";
import { toJson } from "@codemark/cli/lib/json";
import { addKey } from "@codemark/cli/ops/addKey";
import { initPublisher } from "@codemark/cli/ops/init";
import { publish } from "@codemark/cli/ops/publish";
import { env } from "../env";
import { anvil, isAnvil } from "../lib/anvil";
import { forkContext } from "../lib/forkContext";
import { sepoliaTargets } from "../lib/targets";

const url = env.ANVIL_RPC_URL;
if (!(await isAnvil(url))) {
	console.error(`no Anvil fork at ${url}; start one with: bun run fork`);
	process.exit(1);
}

const ctx = await forkContext(url);
if (env.SEED_ARKIV)
	ctx.arkiv = createArkivWriters(env.ARKIV_ACCESS_KEY, {
		ci: env.CODEMARK_CI_KEY,
		sec: env.CODEMARK_SEC_KEY,
	});
const node = anvil(url);
const info = await node.forkInfo();
const forkBlock = info.forkConfig?.forkBlockNumber;
const label = process.argv[2] ?? "acmeswap";
const publisher = `${label}.eth`;
const root = ctx.signers.root?.account.address;
const sec = ctx.signers.sec?.account.address;
const ci = ctx.signers.ci?.account.address;
if (!root || !sec || !ci) throw new Error("root, sec and ci keys are required");

const init = await initPublisher(ctx, { label, sec });
const ciKey = await addKey(ctx, { publisher, key: "ci-1", sec, ci });
const delegatesKey = await addKey(ctx, { publisher, key: "delegates", sec });

const common = { publisher };
const router = await publish(ctx, {
	...common,
	key: "ci-1",
	component: "router",
	version: "3.1.0",
	kind: "contract",
	target: sepoliaTargets.router,
});
const portal = await publish(ctx, {
	...common,
	key: "ci-1",
	component: "portal",
	version: "2.0.0",
	kind: "contract",
	target: sepoliaTargets.portalProxy,
});
const delegate = await publish(ctx, {
	...common,
	key: "delegates",
	component: "delegate",
	version: "1.0.0",
	kind: "delegate",
	target: sepoliaTargets.delegate,
});

const seed = {
	chainId: ctx.ens.deployment.chainId,
	rpcUrl: url,
	forkBlock,
	seededAtBlock: await ctx.ens.publicClient.getBlockNumber(),
	deployment: ctx.ens.deployment,
	accounts: { root: ctx.root?.address, owner: root, sec, ci },
	publisher: init,
	keys: { "ci-1": ciKey, delegates: delegatesKey },
	releases: { router, portal, delegate },
	targets: sepoliaTargets,
};

const dir = env.STATE_DIR;
await mkdir(dir, { recursive: true });
const out = `${dir}/seed.json`;
await Bun.write(out, `${toJson(seed)}\n`);
console.log(`wrote ${out}`);
for (const release of [router, portal, delegate])
	console.log(
		`${release.name}  ${release.target}  arkiv=${release.arkiv.status}`,
	);
