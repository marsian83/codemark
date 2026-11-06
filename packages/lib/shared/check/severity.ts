import type { Severity, Verdict } from "../verdict";
import type { PublisherVerdict, TargetRole } from "./types";

export const severityRank: Record<Severity, number> = {
	info: 0,
	amber: 1,
	warning: 2,
	critical: 3,
};

export function maxSeverity(list: Severity[]): Severity {
	return list.reduce<Severity>(
		(a, b) => (severityRank[b] > severityRank[a] ? b : a),
		"info",
	);
}

const verdictRank: Record<Verdict, number> = {
	VERIFIED: 0,
	"VERIFIED-unproven": 1,
	"KEY REVOKED": 2,
	PULLED: 3,
	MISMATCH: 4,
	UNKNOWN: 5,
};

export function bestVerdict<T extends { verdict: Verdict }>(
	list: T[],
): T | undefined {
	return [...list].sort(
		(a, b) => verdictRank[a.verdict] - verdictRank[b.verdict],
	)[0];
}

export type Thresholds = {
	delegateMinAgeSeconds: number;
	freshCallAgeSeconds: number;
};

export type Flags = {
	indexIncomplete?: boolean;
	indexFlooded?: boolean;
	indexUnavailable?: boolean;
};

const strictRoles: TargetRole[] = ["delegation", "delegatecall"];

export function formatAge(seconds: number): string {
	if (seconds < 120) return `${seconds} s`;
	if (seconds < 7200) return `${Math.floor(seconds / 60)} min`;
	if (seconds < 172800) return `${Math.floor(seconds / 3600)} h`;
	return `${Math.floor(seconds / 86400)} d`;
}

function describe(v: PublisherVerdict): string {
	const r = v.release;
	const parts = [
		v.publisher,
		v.key,
		r ? `${r.component} ${r.version}` : undefined,
	];
	if (r) parts.push(r.proven ? "proven" : "unproven");
	if (r?.ageSeconds !== undefined)
		parts.push(`published ${formatAge(r.ageSeconds)} ago`);
	return parts.filter(Boolean).join(" · ");
}

function revocation(v: PublisherVerdict): string {
	const why = v.reason ? `: ${v.reason}` : "";
	if (v.verdict === "KEY REVOKED") return `KEY REVOKED by ${v.publisher}${why}`;
	if (v.verdict === "PULLED") return `PULLED by ${v.publisher}${why}`;
	return `MISMATCH under ${v.publisher}${why}`;
}

function unpinnedLine(verdicts: PublisherVerdict[], flags: Flags): string {
	const vouch = verdicts.find(
		(v) => v.verdict === "VERIFIED" || v.verdict === "VERIFIED-unproven",
	);
	const dispute = verdicts.find(
		(v) => v.verdict !== "VERIFIED" && v.verdict !== "VERIFIED-unproven",
	);
	if (vouch) return `Vouched for by ${vouch.publisher} (not pinned)`;
	if (dispute)
		return `Disputed by ${dispute.publisher} (not pinned): ${dispute.verdict}`;
	if (flags.indexFlooded)
		return "Unknown: the index is flooded for this address";
	if (flags.indexIncomplete)
		return "Unknown: the index answer was incomplete for this address";
	if (flags.indexUnavailable)
		return "Unknown: no pinned publisher claims this address and the index is unreachable";
	return "Unknown: no publisher claims this address";
}

export function decide(
	role: TargetRole,
	verdicts: PublisherVerdict[],
	t: Thresholds,
	flags: Flags = {},
): { severity: Severity; headline: string } {
	const pinned = verdicts.filter((v) => v.pinned);
	const unpinned = verdicts.filter((v) => !v.pinned);
	const bad = pinned.find(
		(v) =>
			v.verdict === "KEY REVOKED" ||
			v.verdict === "PULLED" ||
			v.verdict === "MISMATCH",
	);
	if (bad) return { severity: "critical", headline: revocation(bad) };
	const strict = strictRoles.includes(role);
	const best = bestVerdict(
		pinned.filter(
			(v) => v.verdict === "VERIFIED" || v.verdict === "VERIFIED-unproven",
		),
	);
	if (best) {
		const proven = best.verdict === "VERIFIED" && best.release?.proven === true;
		const age = best.release?.ageSeconds;
		if (strict) {
			if (proven && age !== undefined && age >= t.delegateMinAgeSeconds)
				return { severity: "info", headline: describe(best) };
			const why = !proven
				? "not proven immutable"
				: `younger than ${formatAge(t.delegateMinAgeSeconds)}`;
			return {
				severity: "critical",
				headline: `${describe(best)} (${why}; ${role} needs an aged, proven release)`,
			};
		}
		if (!proven) return { severity: "warning", headline: describe(best) };
		if (age === undefined || age < t.freshCallAgeSeconds)
			return { severity: "amber", headline: describe(best) };
		return { severity: "info", headline: describe(best) };
	}
	const line = unpinnedLine(unpinned, flags);
	return { severity: strict ? "critical" : "warning", headline: line };
}
