import { describe, expect, test } from "bun:test";
import { type Address, createPublicClient, http } from "viem";
import { sepolia as sepoliaChain } from "viem/chains";
import type { Found, ReleaseColumns } from "../arkiv/rows";
import { checkTargets } from "../check";
import type { CheckDeps, TargetRole } from "../check/types";
import { sepolia } from "../ens/addresses";
import type { EnsClient } from "../ens/client";
import type { ArtifactId } from "../names";
import { MemoryIndex, meta } from "./checkFork";

type SeedRelease = {
	publisher: string;
	key: string;
	kind: "contract" | "delegate";
	version: string;
	target: Address;
	artifact: ArtifactId;
	name: string;
	labelhash: `0x${string}`;
	keyRegistry: Address;
	resolverBlock: string;
	regBlock: string;
	signer: Address;
};

type Seed = {
	rpcUrl: string;
	seededAtBlock: string;
	publisher: { name: string; pubRegistry: Address };
	releases: Record<"router" | "portal" | "delegate", SeedRelease>;
	targets: Record<string, Address>;
};

async function loadSeed(): Promise<Seed | undefined> {
	try {
		return (await import("../../../demo/state/seed.json"))
			.default as unknown as Seed;
	} catch {
		return undefined;
	}
}

const seed = await loadSeed();
const rpc =
	process.env.CODEMARK_SEED_RPC ?? seed?.rpcUrl ?? "http://127.0.0.1:8545";
const client = createPublicClient({
	chain: sepoliaChain,
	transport: http(rpc),
});

async function seeded() {
	if (!seed) return false;
	try {
		const code = await client.getCode({ address: seed.publisher.pubRegistry });
		return (
			(await client.getChainId()) === sepolia.chainId &&
			code !== undefined &&
			code !== "0x"
		);
	} catch {
		return false;
	}
}

const ready = await seeded();
if (!ready)
	console.warn(
		`no seeded fork at ${rpc} (demo/state/seed.json): seed tests skipped`,
	);

function row(r: SeedRelease): Found<ReleaseColumns> {
	return {
		row: {
			artifact: r.artifact,
			keyRegistry: r.keyRegistry,
			publisher: r.publisher,
			keyLabel: r.key,
			name: r.name,
			labelhash: r.labelhash,
			resolverBlock: BigInt(r.resolverBlock),
			regBlock: BigInt(r.regBlock),
			kind: "contract",
			version: r.version,
		},
		meta: meta(r.signer),
	};
}

describe.if(ready)("checker against the seeded demo fork (read-only)", () => {
	const s = seed as Seed;
	const pins = [
		{ name: s.publisher.name, pubRegistry: s.publisher.pubRegistry },
	];
	const index = new MemoryIndex();
	index.releases.push(row(s.releases.router), row(s.releases.portal));
	const deps: CheckDeps = {
		ens: {
			chain: sepoliaChain,
			publicClient: client as unknown as EnsClient["publicClient"],
			deployment: sepolia,
		},
		arkiv: index,
		now: Math.floor(Date.now() / 1000),
		delegateMinAgeSeconds: 86_400,
		freshCallAgeSeconds: 3_600,
	};
	const run = (address: Address, role: TargetRole, withPins = true) =>
		checkTargets(
			{
				targets: [{ address, chainId: sepolia.chainId, role, via: "seed" }],
				pins: withPins ? pins : [],
			},
			deps,
		);

	test("router: pinned, proven", async () => {
		const res = await run(s.releases.router.target, "call");
		const v = res.results[0]?.verdicts[0];
		expect(res.results[0]?.error).toBeUndefined();
		expect(v?.verdict).toBe("VERIFIED");
		expect(v?.release?.proven).toBe(true);
		expect(["amber", "info"]).toContain(res.severity);
	}, 60_000);

	test("portal: EIP-1967 proxy with implementation hash, proven", async () => {
		const res = await run(s.releases.portal.target, "call");
		expect(res.results[0]?.verdicts[0]?.verdict).toBe("VERIFIED");
		expect(res.results[0]?.verdicts[0]?.release?.implementation).toBeDefined();
	}, 60_000);

	test("delegate: proven from Sepolia logs without an index row", async () => {
		const res = await run(s.releases.delegate.target, "delegation");
		const v = res.results[0]?.verdicts[0];
		expect(v?.verdict).toBe("VERIFIED");
		expect(v?.release?.kind).toBe("delegate");
		expect(v?.release?.name).toBe(s.releases.delegate.name);
		expect(v?.release?.proven).toBe(true);
	}, 60_000);

	test("router without the pin is only vouched for", async () => {
		const res = await run(s.releases.router.target, "call", false);
		expect(res.results[0]?.headline).toBe(
			`Vouched for by ${s.publisher.name} (not pinned)`,
		);
		expect(res.severity).toBe("warning");
	}, 60_000);

	test("an unpublished address is UNKNOWN", async () => {
		const res = await run(
			"0x000000000000000000000000000000000000dEaD",
			"approval-spender",
		);
		expect(res.results[0]?.verdicts).toEqual([]);
		expect(res.severity).toBe("warning");
	}, 60_000);
});
