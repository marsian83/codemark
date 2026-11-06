import type { Address } from "viem";
import { type ArtifactId, forwardLabel, releaseName } from "../names";
import {
	parseRecord,
	type ReleaseRecord,
	recordKey,
	sepoliaCoinType,
} from "../record";
import type { Verdict } from "../verdict";
import {
	addressFromAddrRecord,
	codeProblem,
	labelMatchesRecord,
	recordProblem,
	splitReleaseName,
	versionLabel,
} from "./binding";
import {
	addrViaUniversal,
	type Ctx,
	codeInfo,
	directAddr,
	erc1967BeaconSlot,
	implementationSlot,
	isRevert,
	isZero,
	lookupResolver,
	registry,
	sameAddress,
	slotAddress,
	textViaUniversal,
} from "./chain";
import type { Cut, Pull } from "./incidents";
import { cached, remember } from "./logs";
import {
	type Blocks,
	findDelegateBlocks,
	proveFromLogs,
	soleRootRegistrar,
	staticProof,
} from "./proof";
import type { Publisher } from "./publisher";
import type { PublisherVerdict, ReleaseInfo, Target } from "./types";

export type Candidate = {
	pub: Publisher;
	pinned: boolean;
	keyLabel: string;
	keyRegistry: Address;
	name: string;
	blocks?: Blocks;
	altLabels?: string[];
	signers?: Address[];
};

export type Evidence = {
	target: Target;
	artifact: ArtifactId;
	cuts: Cut[];
	pulls: Pull[];
};

type Outcome = Omit<PublisherVerdict, "publisher" | "pinned" | "source">;

function verdict(
	c: Candidate,
	v: Verdict,
	extra: Partial<Outcome> = {},
): Outcome {
	return { verdict: v, key: c.keyLabel, keyRegistry: c.keyRegistry, ...extra };
}

async function revoked(
	ctx: Ctx,
	c: Candidate,
	label: string,
	ev: Evidence,
	cut: Cut,
) {
	for (const l of new Set([label, ...(c.altLabels ?? [])])) {
		const res = await registry.resolver(ctx, c.keyRegistry, l);
		if (isZero(res)) continue;
		const name = `${l}.${c.keyLabel}.${c.pub.name}`;
		const bytes = await directAddr(ctx, res, name, BigInt(sepoliaCoinType));
		const addr = bytes ? addressFromAddrRecord(bytes) : undefined;
		if (sameAddress(addr, ev.target.address))
			return verdict(c, "KEY REVOKED", {
				reason: cut.reason || "the publisher revoked this key",
			});
	}
	return undefined;
}

async function records(ctx: Ctx, name: string, expected: Address) {
	try {
		const [text, addr] = await Promise.all([
			textViaUniversal(ctx, name, recordKey),
			addrViaUniversal(ctx, name, BigInt(sepoliaCoinType)),
		]);
		if (
			!sameAddress(text.resolver, expected) ||
			!sameAddress(addr.resolver, expected)
		)
			return undefined;
		return { text: text.value, addr: addr.value };
	} catch (err) {
		if (isRevert(err)) return undefined;
		throw err;
	}
}

async function codeFacts(ctx: Ctx, target: Address) {
	const [code, implementation, beacon] = await Promise.all([
		codeInfo(ctx, target),
		implementationSlot(ctx, target),
		slotAddress(ctx, target, erc1967BeaconSlot),
	]);
	const implementationCodeHash = implementation
		? (await codeInfo(ctx, implementation)).hash
		: undefined;
	return {
		codeHash: code.hash,
		empty: code.empty,
		delegated: code.delegated,
		beacon,
		implementation,
		implementationCodeHash,
	};
}

async function bound(
	ctx: Ctx,
	c: Candidate,
	label: string | undefined,
	res: Address,
) {
	if (!label) return undefined;
	const r = await registry.resolver(ctx, c.keyRegistry, label);
	return sameAddress(r, res)
		? releaseName(c.pub.name, c.keyLabel, label)
		: undefined;
}

async function displayNames(
	ctx: Ctx,
	c: Candidate,
	record: ReleaseRecord,
	artifact: ArtifactId,
	res: Address,
) {
	const verLabel = versionLabel(record.component, record.version);
	const [versionName, forwardName] = await Promise.all([
		bound(ctx, c, verLabel, res),
		bound(ctx, c, forwardLabel(artifact), res),
	]);
	const name = versionName ?? c.name;
	return { name, label: name.split(".")[0] as string, forwardName };
}

export async function evaluate(
	ctx: Ctx,
	c: Candidate,
	ev: Evidence,
): Promise<Outcome | undefined> {
	const split = splitReleaseName(c.name);
	if (!split || !c.pub.pubRegistry || !c.pub.root) return undefined;
	const { label } = split;
	const cut = ev.cuts.find((k) => sameAddress(k.keyRegistry, c.keyRegistry));
	if (cut) return revoked(ctx, c, label, ev, cut);

	const found = await lookupResolver(ctx, c.name);
	const pull = ev.pulls.find((p) => sameAddress(p.keyRegistry, c.keyRegistry));
	if (isZero(found.resolver) || found.offset !== 0n) {
		if (pull)
			return verdict(c, "PULLED", {
				reason: pull.reason || "the publisher pulled this release",
			});
		return undefined;
	}
	const live = await registry.subregistry(ctx, c.pub.pubRegistry, c.keyLabel);
	if (!sameAddress(live, c.keyRegistry)) return undefined;
	const [labelResolver, labelSub] = await Promise.all([
		registry.resolver(ctx, c.keyRegistry, label),
		registry.subregistry(ctx, c.keyRegistry, label),
	]);
	if (!sameAddress(labelResolver, found.resolver))
		return verdict(c, "MISMATCH", {
			reason:
				"the name resolves through a different resolver than its key registry lists",
		});
	if (!isZero(labelSub))
		return verdict(c, "MISMATCH", {
			reason: "the release name has names beneath it",
		});

	const recs = await records(ctx, c.name, found.resolver);
	if (!recs)
		return verdict(c, "MISMATCH", {
			reason:
				"the release records could not be read through the Universal Resolver",
		});
	const addr = addressFromAddrRecord(recs.addr);
	if (!sameAddress(addr, ev.target.address)) return undefined;
	const record = parseRecord(recs.text);
	if (!record)
		return verdict(c, "MISMATCH", {
			reason: "the codemark record is missing or malformed",
		});
	if (!labelMatchesRecord(label, record, ev.artifact))
		return verdict(c, "MISMATCH", {
			reason: "the record does not belong under this name",
		});
	const recProblem = recordProblem(record, ev.target, recs.addr);
	if (recProblem) return verdict(c, "MISMATCH", { reason: recProblem });
	if (
		record.kind === "delegate" &&
		!(await soleRootRegistrar(ctx, c.keyRegistry, c.pub.root))
	)
		return verdict(c, "MISMATCH", {
			reason: "a delegate was published under a key the CI can write to",
		});
	const facts = await codeFacts(ctx, ev.target.address);
	const cProblem = codeProblem(record, facts);
	if (cProblem) return verdict(c, "MISMATCH", { reason: cProblem });
	if (pull)
		return verdict(c, "MISMATCH", {
			reason: "the name was registered again after the publisher pulled it",
		});

	const shown = await displayNames(ctx, c, record, ev.artifact, found.resolver);
	const release: ReleaseInfo = {
		name: shown.name,
		label: shown.label,
		forwardName: shown.forwardName,
		kind: record.kind,
		component: record.component,
		version: record.version,
		resolver: found.resolver,
		codeHash: facts.codeHash,
		implementation: facts.implementation,
		proven: false,
	};
	const statics = await staticProof(ctx, {
		res: found.resolver,
		keyRegistry: c.keyRegistry,
		labels: [label],
		root: c.pub.root,
		signers: c.signers,
	});
	if (!statics.ok)
		return verdict(c, "MISMATCH", { reason: statics.reason, release });
	const blocksKey = `blocks:${c.keyRegistry.toLowerCase()}:${label}:${found.resolver.toLowerCase()}`;
	let blocks = c.blocks;
	if (!blocks) {
		const hit = await cached<{
			resolverBlock: string;
			regBlock: string;
			regLabel: string;
		}>(ctx, blocksKey);
		if (hit)
			blocks = {
				resolverBlock: BigInt(hit.resolverBlock),
				regBlock: BigInt(hit.regBlock),
				regLabel: hit.regLabel,
			};
	}
	if (!blocks && record.kind === "delegate")
		blocks = await findDelegateBlocks(
			ctx,
			c.keyRegistry,
			label,
			found.resolver,
			c.pub.root,
		);
	if (!blocks) {
		if (record.kind === "delegate")
			return verdict(c, "MISMATCH", {
				reason: "no registration by root was found for this delegate",
				release,
			});
		return verdict(c, "VERIFIED-unproven", {
			release,
			reason:
				"immutability not proven: no index row or cached proof for this release",
		});
	}
	if (blocks.regLabel !== label) {
		const other = await registry.resolver(ctx, c.keyRegistry, blocks.regLabel);
		if (!sameAddress(other, found.resolver))
			return verdict(c, "MISMATCH", {
				reason: "the indexed release name uses a different resolver",
				release,
			});
	}
	if (blocks.regLabel !== label) {
		const more = await staticProof(ctx, {
			res: found.resolver,
			keyRegistry: c.keyRegistry,
			labels: [blocks.regLabel],
			root: c.pub.root,
		});
		if (!more.ok)
			return verdict(c, "MISMATCH", { reason: more.reason, release });
	}
	const proof = await proveFromLogs(ctx, {
		res: found.resolver,
		keyRegistry: c.keyRegistry,
		blocks,
		root: c.pub.root,
	});
	if (!proof.ok)
		return verdict(c, "MISMATCH", { reason: proof.reason, release });
	await remember(ctx, blocksKey, {
		resolverBlock: String(blocks.resolverBlock),
		regBlock: String(blocks.regBlock),
		regLabel: blocks.regLabel,
	});
	return verdict(c, "VERIFIED", {
		release: {
			...release,
			proven: true,
			regBlock: blocks.regBlock,
			registeredAt: proof.registeredAt,
			ageSeconds: proof.ageSeconds,
		},
	});
}
