import type { Found, IncidentColumns, ReleaseColumns } from "../arkiv/rows";
import { contractArtifact } from "../names";
import type { Ctx } from "./chain";
import { publisherOfIncident } from "./incidents";
import { evaluatePublisher } from "./publisherVerdict";
import { decide, maxSeverity } from "./severity";
import type {
	CheckDeps,
	CheckRequest,
	CheckResult,
	Pin,
	PublisherVerdict,
	Target,
	TargetResult,
} from "./types";

export { versionLabel } from "./binding";
export { decide, formatAge, maxSeverity } from "./severity";
export type * from "./types";

const DEFAULT_CHUNK = 49_000n;
const DEFAULT_DEPTH = 1_500_000n;
const DEFAULT_LAG = 2n;

async function readIndex(
	ctx: Ctx,
	artifact: ReturnType<typeof contractArtifact>,
) {
	const arkiv = ctx.deps.arkiv;
	const empty = {
		releases: [] as Found<ReleaseColumns>[],
		pulls: [] as Found<IncidentColumns>[],
	};
	if (!arkiv) return { ...empty, flooded: false, unavailable: true };
	try {
		const maxPages = ctx.deps.maxIndexPages ?? 3;
		const [releases, pulls] = await Promise.all([
			arkiv.findReleases(artifact, { maxPages }),
			arkiv.findIncidentsByArtifact(artifact, { maxPages }),
		]);
		return {
			releases: releases.rows.filter((r) => r.row.artifact === artifact),
			pulls: pulls.rows.filter((r) => r.row.artifact === artifact),
			flooded: releases.indexFlooded || pulls.indexFlooded,
			incomplete: releases.incomplete || pulls.incomplete,
			unavailable: false,
		};
	} catch {
		return { ...empty, flooded: false, incomplete: false, unavailable: true };
	}
}

async function checkTarget(
	ctx: Ctx,
	target: Target,
	pins: Pin[],
): Promise<TargetResult> {
	const artifact = contractArtifact(target.chainId, target.address);
	const base = { target, artifact, block: ctx.block };
	if (target.chainId !== ctx.ens.chain.id) {
		const d = decide(target.role, [], ctx.deps);
		return {
			...base,
			verdicts: [],
			severity: d.severity,
			headline: `Unknown: chain ${target.chainId} is not checked`,
		};
	}
	const index = await readIndex(ctx, artifact);
	const names = [
		...new Set([
			...pins.map((p) => p.name),
			...index.releases.map((r) => r.row.publisher),
		]),
	];
	const verdicts: PublisherVerdict[] = [];
	const skipped: string[] = [];
	let incidentsIncomplete = false;
	for (const name of names) {
		const pin = pins.find((p) => p.name === name);
		try {
			const j = await evaluatePublisher(ctx, {
				name,
				pin,
				target,
				artifact,
				rows: index.releases.filter((r) => r.row.publisher === name),
				pulls: index.pulls.filter((r) => publisherOfIncident(r) === name),
			});
			if (j.verdict) verdicts.push(j.verdict);
			if (j.incidentsIncomplete) incidentsIncomplete = true;
		} catch (err) {
			if (!pin) {
				skipped.push(name);
				continue;
			}
			verdicts.push({
				publisher: name,
				pinned: true,
				source: "pinned",
				verdict: "MISMATCH",
				reason: `the check of this pinned publisher failed: ${errorText(err)}`,
			});
		}
	}
	index.incomplete ||= incidentsIncomplete;
	const flags = {
		indexFlooded: index.flooded,
		indexIncomplete: index.incomplete,
		indexUnavailable: index.unavailable,
	};
	const d = decide(target.role, verdicts, ctx.deps, flags);
	return {
		...base,
		verdicts,
		severity: d.severity,
		headline: d.headline,
		indexFlooded: index.flooded || undefined,
		indexIncomplete: index.incomplete || undefined,
		indexUnavailable: index.unavailable || undefined,
		skippedPublishers: skipped.length > 0 ? skipped : undefined,
	};
}

function errorText(err: unknown) {
	return err instanceof Error
		? (err.message.split("\n")[0] ?? "")
		: String(err);
}

async function pinnedHead(deps: CheckDeps) {
	const client = deps.ens.publicClient;
	const [head, lag] = await Promise.all([
		client.getBlockNumber({ cacheTime: 0 }),
		deps.headLag !== undefined
			? Promise.resolve(deps.headLag)
			: defaultLag(deps),
	]);
	return head > lag ? head - lag : head;
}

async function defaultLag(deps: CheckDeps) {
	try {
		const version = await deps.ens.publicClient.request({
			method: "web3_clientVersion",
		});
		return String(version).toLowerCase().includes("anvil") ? 0n : DEFAULT_LAG;
	} catch {
		return DEFAULT_LAG;
	}
}

export async function checkTargets(
	request: CheckRequest,
	deps: CheckDeps,
): Promise<CheckResult> {
	const client = deps.ens.publicClient;
	const block = deps.block ?? (await pinnedHead(deps));
	const { timestamp } = await client.getBlock({ blockNumber: block });
	const ctx: Ctx = {
		ens: deps.ens,
		deps,
		block,
		timestamp,
		chunk: deps.logChunkBlocks ?? DEFAULT_CHUNK,
		depth: deps.scanDepthBlocks ?? DEFAULT_DEPTH,
		memo: new Map(),
	};
	const results: TargetResult[] = [];
	for (const target of request.targets) {
		try {
			results.push(await checkTarget(ctx, target, request.pins));
		} catch (err) {
			const strict =
				target.role === "delegation" || target.role === "delegatecall";
			results.push({
				target,
				artifact: contractArtifact(target.chainId, target.address),
				verdicts: [],
				severity: strict ? "critical" : "warning",
				headline: "Could not complete the check",
				block,
				error: errorText(err),
			});
		}
	}
	return {
		block,
		results,
		severity: maxSeverity(results.map((r) => r.severity)),
	};
}
