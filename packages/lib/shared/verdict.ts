export const verdicts = [
	"VERIFIED",
	"VERIFIED-unproven",
	"KEY REVOKED",
	"PULLED",
	"MISMATCH",
	"UNKNOWN",
] as const;
export type Verdict = (typeof verdicts)[number];

export type Severity = "info" | "amber" | "warning" | "critical";

export type Finding = {
	verdict: Verdict;
	severity: Severity;
	publisher?: string;
	release?: string;
	key?: string;
	reason: string;
	ensBlock?: bigint;
};
