import { type Address, isAddressEqual, labelhash } from "viem";
import type { Found, IncidentColumns, ReleaseColumns } from "../arkiv/rows";
import { type SplitName, splitReleaseName } from "./binding";

export type RowProblem = string | undefined;

export function provenanceProblem(meta: Found<unknown>["meta"]): RowProblem {
	if (!isAddressEqual(meta.creator, meta.owner))
		return "the row was transferred away from its creator";
	if (!meta.readonly) return "the row was not created read-only";
	return undefined;
}

export function releaseRowProblem(
	found: Found<ReleaseColumns>,
): { problem: string } | { split: SplitName } {
	const p = provenanceProblem(found.meta);
	if (p) return { problem: p };
	const { row } = found;
	const split = splitReleaseName(row.name);
	if (!split)
		return { problem: "the row's name is not <label>.<key>.<publisher>" };
	if (split.key !== row.keyLabel || split.publisher !== row.publisher)
		return { problem: "the row's name does not match its key and publisher" };
	if (labelhash(split.label) !== row.labelhash.toLowerCase())
		return { problem: "the row's labelhash does not match its name" };
	if (row.regBlock < row.resolverBlock)
		return {
			problem: "the row registers the name before deploying its resolver",
		};
	return { split };
}

export function incidentRowProblem(
	found: Found<IncidentColumns>,
	action: "pull" | "cut",
): RowProblem {
	const p = provenanceProblem(found.meta);
	if (p) return p;
	if (found.row.action !== action) return `not a ${action} incident`;
	if (action === "cut" && found.row.linkBlock === undefined)
		return "a cut incident needs linkBlock";
	return undefined;
}

export function sanitizeReason(reason: string): string {
	const clean = Array.from(reason)
		.filter((ch) => {
			const c = ch.codePointAt(0) ?? 0;
			return (
				c >= 0x20 &&
				!(c >= 0x7f && c <= 0x9f) &&
				!(c >= 0x200b && c <= 0x200f) &&
				!(c >= 0x202a && c <= 0x202e) &&
				!(c >= 0x2060 && c <= 0x2069) &&
				c !== 0xfeff
			);
		})
		.join("")
		.trim();
	return clean.length > 280 ? `${clean.slice(0, 279)}…` : clean;
}

export function keyOf(publisher: string, keyRegistry: Address) {
	return `${publisher}|${keyRegistry.toLowerCase()}`;
}
