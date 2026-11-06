import { beforeAll, describe, expect, test } from "bun:test";
import type { Abi, Address } from "viem";
import type { Found, IncidentColumns } from "../arkiv/rows";
import { checkTargets } from "../check";
import { dualKeyReason } from "../check/proof";
import type { CheckDeps, Pin, TargetRole } from "../check/types";
import { permissionedResolverAbi, userRegistryAbi } from "../ens/abi";
import { dnsEncode, readText } from "../ens/resolve";
import { resolverRoles } from "../ens/roles";
import { labelId } from "../names";
import { recordKey } from "../record";
import {
	actor,
	ensDroppingLogsAt,
	ensOnFork,
	fork,
	forkReachable,
	forkRpc,
	MemoryCache,
	MemoryIndex,
	meta,
	type Publisher,
	publish,
	type Release,
	randomAddress,
	registerBrokenParent,
	registerLabel,
	releaseRow,
	send,
	setupPublisher,
	unregisterLabel,
} from "./checkFork";

const reachable = await forkReachable();
if (!reachable)
	console.warn(
		`no Anvil fork of Sepolia at ${forkRpc}: fork tests skipped (start one with anvil --fork-url ... --chain-id 11155111 --port 8546)`,
	);
const forkTest = reachable ? test : test.skip;
const T = 120_000;

function deps(extra: Partial<CheckDeps> = {}): CheckDeps {
	return {
		ens: ensOnFork(),
		now: Math.floor(Date.now() / 1000),
		delegateMinAgeSeconds: 86_400,
		freshCallAgeSeconds: 3_600,
		scanDepthBlocks: 2_000n,
		...extra,
	};
}

const pinOf = (pub: Publisher): Pin => ({
	name: pub.name,
	pubRegistry: pub.pubRegistry,
});

async function check(
	rel: Release,
	pins: Pin[],
	extra: Partial<CheckDeps> = {},
	role: TargetRole = "call",
) {
	const res = await checkTargets(
		{
			targets: [{ address: rel.target, chainId: 11155111, role, via: "to" }],
			pins,
		},
		deps(extra),
	);
	const result = res.results[0];
	if (!result) throw new Error("no result");
	if (result.error) throw new Error(result.error);
	return result;
}

describe.if(reachable)("checker on an Anvil fork of Sepolia", () => {
	let pub: Publisher;
	let rel: Release;
	beforeAll(async () => {
		pub = await setupPublisher();
		rel = await publish(pub);
	}, T);

	forkTest(
		"pinned path without the index: VERIFIED-unproven, a warning",
		async () => {
			const r = await check(rel, [pinOf(pub)]);
			expect(r.verdicts[0]?.verdict).toBe("VERIFIED-unproven");
			expect(r.verdicts[0]?.key).toBe("ci-1");
			expect(r.severity).toBe("warning");
		},
		T,
	);

	forkTest(
		"pinned path with an authenticated row: VERIFIED, proven, amber while fresh",
		async () => {
			const index = new MemoryIndex();
			index.releases.push(releaseRow(pub, rel));
			const r = await check(rel, [pinOf(pub)], { arkiv: index });
			expect(r.verdicts[0]?.verdict).toBe("VERIFIED");
			expect(r.verdicts[0]?.release?.proven).toBe(true);
			expect(r.verdicts[0]?.release?.name).toBe(rel.verName);
			expect(r.verdicts[0]?.release?.forwardName).toBe(rel.fwdName);
			expect(r.verdicts[0]?.release?.ageSeconds).toBeLessThan(600);
			expect(r.severity).toBe("amber");
			expect(r.headline).toContain(
				`${pub.name} · ci-1 · router 3.1.0 · proven`,
			);
			const dc = await check(
				rel,
				[pinOf(pub)],
				{ arkiv: index },
				"delegatecall",
			);
			expect(dc.severity).toBe("critical");
		},
		T,
	);

	forkTest(
		"unpinned publishers only vouch: a warning",
		async () => {
			const index = new MemoryIndex();
			index.releases.push(releaseRow(pub, rel));
			const r = await check(rel, [], { arkiv: index });
			expect(r.verdicts[0]?.verdict).toBe("VERIFIED");
			expect(r.verdicts[0]?.pinned).toBe(false);
			expect(r.severity).toBe("warning");
			expect(r.headline).toBe(`Vouched for by ${pub.name} (not pinned)`);
		},
		T,
	);

	forkTest(
		"a row created by a key without ROLE_REGISTRAR is dropped",
		async () => {
			const index = new MemoryIndex();
			index.releases.push(releaseRow(pub, rel, meta(await actor())));
			const r = await check(rel, [], { arkiv: index });
			expect(r.verdicts).toEqual([]);
			expect(r.headline).toStartWith("Unknown");
		},
		T,
	);

	forkTest(
		"a row transferred to the CI key is dropped",
		async () => {
			const index = new MemoryIndex();
			index.releases.push(
				releaseRow(pub, rel, meta(await actor(), { owner: pub.ci })),
			);
			const r = await check(rel, [], { arkiv: index });
			expect(r.verdicts).toEqual([]);
		},
		T,
	);

	forkTest(
		"a row naming a non-contract key registry is dropped without failing the check",
		async () => {
			const index = new MemoryIndex();
			const row = releaseRow(pub, rel);
			index.releases.push({
				...row,
				row: { ...row.row, keyRegistry: await actor() },
			});
			const r = await check(rel, [], { arkiv: index });
			expect(r.verdicts).toEqual([]);
		},
		T,
	);
});

describe.if(reachable)("immutability proof", () => {
	forkTest(
		"rewriting a record after creation, even to the same value, is MISMATCH",
		async () => {
			const pub = await setupPublisher();
			const rel = await publish(pub);
			const text = await readText(
				ensOnFork(),
				rel.resolver,
				rel.fwdName,
				recordKey,
			);
			await send(
				pub.root,
				rel.resolver,
				permissionedResolverAbi as Abi,
				"setText",
				[dnsEncode(rel.fwdName), recordKey, text],
			);
			const index = new MemoryIndex();
			index.releases.push(releaseRow(pub, rel));
			const r = await check(rel, [pinOf(pub)], { arkiv: index });
			expect(r.verdicts[0]?.verdict).toBe("MISMATCH");
			expect(r.verdicts[0]?.reason).toContain("changed after it was created");
			expect(r.severity).toBe("critical");
		},
		T,
	);

	forkTest(
		"a setter role granted to the CI key at initialisation is MISMATCH",
		async () => {
			const pub = await setupPublisher();
			const rel = await publish(pub, {
				extraGrants: [
					{ account: pub.ci, roleBitmap: resolverRoles.ROLE_SET_ADDRESS },
				],
			});
			const index = new MemoryIndex();
			index.releases.push(releaseRow(pub, rel));
			const r = await check(rel, [pinOf(pub)], { arkiv: index });
			expect(r.verdicts[0]?.verdict).toBe("MISMATCH");
			expect(r.severity).toBe("critical");
		},
		T,
	);
});

describe.if(reachable)("incidents", () => {
	forkTest(
		"cut: KEY REVOKED with the reason, remembered when the index goes down",
		async () => {
			const pub = await setupPublisher();
			const rel = await publish(pub);
			const key = pub.keys["ci-1"];
			if (!key) throw new Error("no key");
			const tokenId = await fork.readContract({
				address: pub.pubRegistry,
				abi: userRegistryAbi,
				functionName: "getTokenId",
				args: [labelId("ci-1")],
			});
			const cut = await send(
				pub.sec,
				pub.pubRegistry,
				userRegistryAbi as Abi,
				"unregister",
				[tokenId],
			);
			const silent = await check(rel, [pinOf(pub)], {
				arkiv: new MemoryIndex(),
			});
			expect(silent.verdicts).toEqual([]);
			expect(silent.severity).toBe("warning");
			const index = new MemoryIndex();
			index.releases.push(releaseRow(pub, rel));
			index.incidents.push({
				row: {
					action: "cut",
					keyRegistry: key.registry,
					name: `ci-1.${pub.name}`,
					reason: "CI key leaked",
					ensTx: cut.transactionHash,
					block: cut.blockNumber,
					linkBlock: key.linkBlock,
				},
				meta: meta(pub.sec),
			});
			const cache = new MemoryCache();
			const r = await check(rel, [pinOf(pub)], { arkiv: index, cache });
			expect(r.verdicts[0]?.verdict).toBe("KEY REVOKED");
			expect(r.severity).toBe("critical");
			expect(r.headline).toBe(`KEY REVOKED by ${pub.name}: CI key leaked`);
			index.down = true;
			const offline = await check(rel, [pinOf(pub)], { arkiv: index, cache });
			expect(offline.verdicts[0]?.verdict).toBe("KEY REVOKED");
			const forged = new MemoryIndex();
			forged.releases.push(releaseRow(pub, rel));
			const [incident] = index.incidents;
			if (!incident) throw new Error("no incident");
			forged.incidents.push({ ...incident, meta: meta(pub.ci) });
			const unauth = await check(rel, [pinOf(pub)], { arkiv: forged });
			expect(unauth.verdicts).toEqual([]);
		},
		T,
	);

	forkTest(
		"pull: PULLED with the reason; registering again afterwards is MISMATCH",
		async () => {
			const pub = await setupPublisher();
			const rel = await publish(pub);
			const unregister = async (name: string) => {
				const id = await fork.readContract({
					address: rel.keyRegistry,
					abi: userRegistryAbi,
					functionName: "getTokenId",
					args: [labelId(name.split(".")[0] as string)],
				});
				return send(
					pub.root,
					rel.keyRegistry,
					userRegistryAbi as Abi,
					"unregister",
					[id],
				);
			};
			await unregister(rel.verName);
			const pull = await unregister(rel.fwdName);
			const index = new MemoryIndex();
			index.releases.push(releaseRow(pub, rel));
			index.incidents.push({
				row: {
					action: "pull",
					keyRegistry: rel.keyRegistry,
					artifact: rel.artifact,
					name: rel.verName,
					reason: "router bug",
					ensTx: pull.transactionHash,
					block: pull.blockNumber,
				},
				meta: meta(pub.sec),
			});
			const r = await check(rel, [pinOf(pub)], { arkiv: index });
			expect(r.verdicts[0]?.verdict).toBe("PULLED");
			expect(r.headline).toBe(`PULLED by ${pub.name}: router bug`);
			expect(r.severity).toBe("critical");
			const again = await publish(pub, { target: rel.target });
			const fresh = new MemoryIndex();
			fresh.incidents = index.incidents;
			fresh.releases.push(releaseRow(pub, again));
			const back = await check(again, [pinOf(pub)], { arkiv: fresh });
			expect(back.verdicts[0]?.verdict).toBe("MISMATCH");
		},
		T,
	);
});

describe.if(reachable)("7702 delegates", () => {
	forkTest(
		"a delegate published by the CI key is MISMATCH for a delegation",
		async () => {
			const pub = await setupPublisher();
			const rel = await publish(pub, { kind: "delegate", version: "1.0.0" });
			const r = await check(rel, [pinOf(pub)], {}, "delegation");
			expect(r.verdicts[0]?.verdict).toBe("MISMATCH");
			expect(r.severity).toBe("critical");
		},
		T,
	);

	forkTest(
		"a root delegate is proven from Sepolia logs alone and passes after the age threshold",
		async () => {
			const pub = await setupPublisher();
			const rel = await publish(pub, {
				key: "delegates",
				from: pub.root,
				kind: "delegate",
				version: "1.0.0",
			});
			const young = await check(rel, [pinOf(pub)], {}, "delegation");
			expect(young.verdicts[0]?.verdict).toBe("VERIFIED");
			expect(young.verdicts[0]?.release?.proven).toBe(true);
			expect(young.verdicts[0]?.release?.name).toBe(rel.verName);
			expect(young.severity).toBe("critical");
			const contract = await check(rel, [], {}, "delegation");
			expect(contract.severity).toBe("critical");
			await fork.increaseTime({ seconds: 2 * 86_400 });
			await fork.mine({ blocks: 1 });
			const old = await check(rel, [pinOf(pub)], {}, "delegation");
			expect(old.severity).toBe("info");
			expect(old.verdicts[0]?.release?.ageSeconds).toBeGreaterThan(86_400);
		},
		T,
	);
});

describe.if(reachable)("adversarial review", () => {
	async function cutPublisher() {
		const pub = await setupPublisher();
		const rel = await publish(pub);
		const key = pub.keys["ci-1"];
		if (!key) throw new Error("no key");
		const cut = await unregisterLabel(pub.pubRegistry, pub.sec, "ci-1");
		const incident: Found<IncidentColumns> = {
			row: {
				action: "cut",
				keyRegistry: key.registry,
				name: `ci-1.${pub.name}`,
				reason: "CI key leaked",
				ensTx: cut.transactionHash,
				block: cut.blockNumber,
				linkBlock: key.linkBlock,
			},
			meta: meta(pub.sec),
		};
		return { pub, rel, key, incident };
	}

	let shared: Awaited<ReturnType<typeof cutPublisher>>;
	beforeAll(async () => {
		shared = await cutPublisher();
	}, T);

	forkTest(
		"a pinned revocation stays critical next to an attacker row whose publisher's registry reverts",
		async () => {
			const { pub, rel, incident } = shared;
			const evilParent = await registerBrokenParent();
			const evilPublisher = `p.${evilParent}`;
			const index = new MemoryIndex();
			index.releases.push(releaseRow(pub, rel));
			const junk = releaseRow(pub, rel, meta(randomAddress()));
			index.releases.push({
				...junk,
				row: {
					...junk.row,
					publisher: evilPublisher,
					name: `router-3-1-0.ci-1.${evilPublisher}`,
				},
			});
			index.incidents.push(incident);
			const r = await check(rel, [pinOf(pub)], { arkiv: index });
			expect(r.verdicts.map((v) => v.verdict)).toEqual(["KEY REVOKED"]);
			expect(r.severity).toBe("critical");
		},
		T,
	);

	forkTest(
		"sec pull, CI revival with the old resolver and a hidden pull row is never green",
		async () => {
			const pub = await setupPublisher();
			const rel = await publish(pub);
			const labels = [rel.verName, rel.fwdName].map(
				(n) => n.split(".")[0] as string,
			);
			for (const l of labels)
				await unregisterLabel(rel.keyRegistry, pub.sec, l);
			let regBlock = 0n;
			for (const l of labels)
				regBlock = (
					await registerLabel(
						rel.keyRegistry,
						pub.ci,
						l,
						pub.root,
						rel.resolver,
					)
				).blockNumber;
			const unproven = await check(rel, [pinOf(pub)]);
			expect(unproven.verdicts[0]?.verdict).toBe("MISMATCH");
			const index = new MemoryIndex();
			index.releases.push(releaseRow(pub, { ...rel, regBlock }));
			const r = await check(rel, [pinOf(pub)], { arkiv: index });
			expect(r.verdicts[0]?.verdict).toBe("MISMATCH");
			expect(r.verdicts[0]?.reason).toContain("revival");
			expect(r.severity).toBe("critical");
		},
		T,
	);

	forkTest(
		"more than 100 junk cut rows before the real one and no cache: still critical",
		async () => {
			const { pub, rel, key, incident } = shared;
			const index = new MemoryIndex();
			index.releases.push(releaseRow(pub, rel));
			const junkCreators = Array.from({ length: 5 }, () => randomAddress());
			for (let i = 0; i < 150; i++)
				index.incidents.push({
					row: {
						...incident.row,
						keyRegistry: key.registry,
						reason: `junk ${i}`,
					},
					meta: meta(junkCreators[i % junkCreators.length] as Address),
				});
			index.incidents.push(incident);
			const r = await check(rel, [pinOf(pub)], { arkiv: index });
			expect(r.verdicts[0]?.verdict).toBe("KEY REVOKED");
			expect(r.headline).toBe(`KEY REVOKED by ${pub.name}: CI key leaked`);
			expect(r.severity).toBe("critical");
		},
		T,
	);

	forkTest(
		"a getLogs that drops the pinned block does not advance the cached scan past it",
		async () => {
			const pub = await setupPublisher();
			const rel = await publish(pub);
			await fork.mine({ blocks: 20 });
			const text = await readText(
				ensOnFork(),
				rel.resolver,
				rel.fwdName,
				recordKey,
			);
			const rewrite = await send(
				pub.root,
				rel.resolver,
				permissionedResolverAbi as Abi,
				"setText",
				[dnsEncode(rel.fwdName), recordKey, text],
			);
			const block = rewrite.blockNumber;
			const index = new MemoryIndex();
			index.releases.push(releaseRow(pub, rel));
			const cache = new MemoryCache();
			const lying = await check(rel, [pinOf(pub)], {
				arkiv: index,
				cache,
				block,
				ens: ensDroppingLogsAt(block),
			});
			expect(lying.verdicts[0]?.verdict).toBe("VERIFIED");
			const scan = (await cache.get(
				`codemark:v1:resolver:${rel.resolver.toLowerCase()}`,
			)) as { scannedTo: string };
			expect(BigInt(scan.scannedTo)).toBeLessThan(block);
			const honest = await check(rel, [pinOf(pub)], {
				arkiv: index,
				cache,
				block,
			});
			expect(honest.verdicts[0]?.verdict).toBe("MISMATCH");
		},
		T,
	);

	forkTest(
		"a CI key that can also unregister in its key registry is MISMATCH",
		async () => {
			const pub = await setupPublisher({ ciCanUnregister: true });
			const rel = await publish(pub);
			const index = new MemoryIndex();
			index.releases.push(releaseRow(pub, rel));
			const r = await check(rel, [pinOf(pub)], { arkiv: index });
			expect(r.verdicts[0]?.verdict).toBe("MISMATCH");
			expect(r.verdicts[0]?.reason).toBe(dualKeyReason);
			expect(r.severity).toBe("critical");
		},
		T,
	);
});
