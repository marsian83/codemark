import { type Address, getAddress } from "viem";
import type { Found, IncidentColumns, ReleaseColumns } from "../arkiv/rows";
import { registryRoles } from "../ens/roles";
import type { ArtifactId } from "../names";
import { forwardLabel, releaseName } from "../names";
import {
	type Ctx,
	isRevert,
	isZero,
	memo,
	registry,
	sameAddress,
} from "./chain";
import { type Candidate, type Evidence, evaluate } from "./evaluate";
import {
	authenticateCut,
	authenticatePull,
	type Cut,
	type Pull,
} from "./incidents";
import { cached, remember } from "./logs";
import { rootOnlyRoles } from "./proof";
import { loadPublisher, type Publisher } from "./publisher";
import { releaseRowProblem } from "./rows";
import { bestVerdict } from "./severity";
import type { Pin, PublisherVerdict, Target } from "./types";

export type PublisherInput = {
	name: string;
	pin?: Pin;
	target: Target;
	artifact: ArtifactId;
	rows: Found<ReleaseColumns>[];
	pulls: Found<IncidentColumns>[];
};

type AuthedRow = { found: Found<ReleaseColumns>; label: string };

async function authenticRows(ctx: Ctx, rows: Found<ReleaseColumns>[]) {
	const out: AuthedRow[] = [];
	for (const found of rows) {
		const shape = releaseRowProblem(found);
		if ("problem" in shape) continue;
		const ok = await registry
			.hasRootRoles(
				ctx,
				found.row.keyRegistry,
				registryRoles.ROLE_REGISTRAR,
				found.meta.creator,
			)
			.catch((err) => {
				if (isRevert(err)) return false;
				throw err;
			});
		if (ok) out.push({ found, label: shape.split.label });
	}
	return out;
}

type CachedCut = {
	keyLabel?: string;
	keyRegistry: Address;
	reason: string;
	block: string;
};

async function findCuts(
	ctx: Ctx,
	pub: Publisher,
	registries: Address[],
	pinned: boolean,
) {
	const cacheKey = `cuts:${pub.name}:${pub.pubRegistry?.toLowerCase()}`;
	const cuts: Cut[] = [];
	let incomplete = false;
	if (pinned) {
		const prior = (await cached<CachedCut[]>(ctx, cacheKey)) ?? [];
		for (const c of prior)
			if (BigInt(c.block) <= ctx.block)
				cuts.push({ ...c, block: BigInt(c.block) });
	}
	const arkiv = ctx.deps.arkiv;
	for (const reg of arkiv ? registries : []) {
		if (!arkiv || cuts.some((c) => sameAddress(c.keyRegistry, reg))) continue;
		let res: Awaited<ReturnType<typeof arkiv.findIncidentsByKeyRegistry>>;
		try {
			res = await memo(ctx, `cutrows:${reg.toLowerCase()}`, () =>
				arkiv.findIncidentsByKeyRegistry(reg, {
					maxPages: ctx.deps.maxIndexPages ?? 3,
				}),
			);
		} catch {
			incomplete = true;
			continue;
		}
		if (res.indexFlooded || res.incomplete) incomplete = true;
		for (const found of res.rows) {
			if (
				found.row.action !== "cut" ||
				!sameAddress(found.row.keyRegistry, reg)
			)
				continue;
			const cut = await authenticateCut(ctx, pub, found);
			if (cut) {
				cuts.push(cut);
				break;
			}
		}
	}
	if (pinned && cuts.length > 0)
		await remember(
			ctx,
			cacheKey,
			cuts.map((c) => ({ ...c, block: String(c.block) })),
		);
	return { cuts, incomplete };
}

async function findPulls(ctx: Ctx, pub: Publisher, input: PublisherInput) {
	const pulls: Pull[] = [];
	for (const found of input.pulls) {
		const pull = await authenticatePull(ctx, pub, found, input.artifact);
		if (pull) pulls.push(pull);
	}
	return pulls;
}

function blocksOf(row: AuthedRow) {
	return {
		resolverBlock: row.found.row.resolverBlock,
		regBlock: row.found.row.regBlock,
		regLabel: row.label,
	};
}

export type PublisherOutcome = {
	verdict?: PublisherVerdict;
	incidentsIncomplete?: boolean;
};

export async function evaluatePublisher(
	ctx: Ctx,
	input: PublisherInput,
): Promise<PublisherOutcome> {
	const pub = await loadPublisher(ctx, input.name);
	const pinned = input.pin !== undefined;
	const source = pinned ? "pinned" : "index";
	if (input.pin && !sameAddress(pub.pubRegistry, input.pin.pubRegistry))
		return {
			verdict: {
				publisher: input.name,
				pinned,
				source,
				verdict: "MISMATCH",
				reason: `the registry behind ${input.name} changed since it was pinned; re-confirm the pin`,
			},
		};
	if (!pub.pubRegistry || !pub.root) return {};
	const pubRegistry = pub.pubRegistry;
	const root = pub.root;
	const rootOnly = await rootOnlyRoles(
		{
			roleCount: (r) => registry.roleCount(ctx, pubRegistry, r),
			roles: (r, a) => registry.roles(ctx, pubRegistry, r, a),
		},
		root,
		registryRoles.ROLE_UNREGISTER,
	);
	if (!rootOnly)
		return {
			verdict: {
				publisher: input.name,
				pinned,
				source,
				verdict: "MISMATCH",
				reason: `someone other than root can change the keys of ${input.name}`,
			},
		};
	const rows = await authenticRows(ctx, input.rows);
	const liveKeys = await Promise.all(
		pub.keys.map(async (key) => ({
			key,
			reg: await registry.subregistry(ctx, pubRegistry, key),
		})),
	);
	const registries = [
		...new Set([
			...rows.map((r) => getAddress(r.found.row.keyRegistry)),
			...liveKeys.map((k) => getAddress(k.reg)),
		]),
	];
	const { cuts, incomplete } = await findCuts(ctx, pub, registries, pinned);
	const pulls = await findPulls(ctx, pub, input);
	const linked = await Promise.all(
		rows.map(async (r) => {
			const live = await registry.subregistry(
				ctx,
				pubRegistry,
				r.found.row.keyLabel,
			);
			const cut = cuts.some((c) =>
				sameAddress(c.keyRegistry, r.found.row.keyRegistry),
			);
			return sameAddress(live, r.found.row.keyRegistry) || cut ? r : undefined;
		}),
	);
	const trusted = linked.filter((r): r is AuthedRow => r !== undefined);
	const fwd = forwardLabel(input.artifact);
	const candidates: Candidate[] = [];
	const labelsFor = (reg: Address) =>
		trusted
			.filter((r) => sameAddress(r.found.row.keyRegistry, reg))
			.map((r) => r.label);
	const signersFor = (reg: Address) => [
		...new Set(
			trusted
				.filter((r) => sameAddress(r.found.row.keyRegistry, reg))
				.map((r) => r.found.meta.creator),
		),
	];
	const rowFor = (reg: Address) =>
		trusted.find((r) => sameAddress(r.found.row.keyRegistry, reg));
	if (pinned) {
		for (const { key, reg } of liveKeys) {
			if (isZero(reg)) continue;
			const row = rowFor(reg);
			candidates.push({
				pub,
				pinned,
				keyLabel: key,
				keyRegistry: reg,
				name: releaseName(pub.name, key, fwd),
				blocks: row ? blocksOf(row) : undefined,
				altLabels: labelsFor(reg),
				signers: signersFor(reg),
			});
		}
		for (const cut of cuts) {
			if (candidates.some((c) => sameAddress(c.keyRegistry, cut.keyRegistry)))
				continue;
			const keyLabel =
				cut.keyLabel ?? rowFor(cut.keyRegistry)?.found.row.keyLabel;
			if (keyLabel)
				candidates.push({
					pub,
					pinned,
					keyLabel,
					keyRegistry: cut.keyRegistry,
					name: releaseName(pub.name, keyLabel, fwd),
					altLabels: labelsFor(cut.keyRegistry),
					signers: signersFor(cut.keyRegistry),
				});
		}
	}
	for (const row of trusted) {
		if (
			candidates.some((c) =>
				sameAddress(c.keyRegistry, row.found.row.keyRegistry),
			)
		)
			continue;
		candidates.push({
			pub,
			pinned,
			keyLabel: row.found.row.keyLabel,
			keyRegistry: row.found.row.keyRegistry,
			name: row.found.row.name,
			blocks: blocksOf(row),
			altLabels: labelsFor(row.found.row.keyRegistry),
			signers: signersFor(row.found.row.keyRegistry),
		});
	}
	const evidence: Evidence = {
		target: input.target,
		artifact: input.artifact,
		cuts,
		pulls,
	};
	const outcomes = (
		await Promise.all(candidates.map((c) => evaluate(ctx, c, evidence)))
	).filter((o) => o !== undefined);
	const best = bestVerdict(outcomes);
	if (!best) return { incidentsIncomplete: incomplete };
	return {
		verdict: { publisher: input.name, pinned, source, ...best },
		incidentsIncomplete: incomplete,
	};
}
