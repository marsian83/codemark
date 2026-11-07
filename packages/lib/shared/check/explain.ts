import type { Severity, Verdict } from "../verdict";
import { bestVerdict, type Thresholds } from "./severity";
import type { PublisherVerdict, TargetResult, TargetRole } from "./types";

function plural(n: number, unit: string): string {
	return `${n} ${unit}${n === 1 ? "" : "s"}`;
}

export function formatDuration(totalSeconds: number): string {
	const s = Math.max(0, Math.floor(totalSeconds));
	if (s < 60) return plural(s, "second");
	if (s < 3600) return plural(Math.floor(s / 60), "minute");
	if (s < 86400) return plural(Math.floor(s / 3600), "hour");
	return plural(Math.floor(s / 86400), "day");
}

export function sentence(text: string): string {
	const t = text.trim();
	if (!t) return t;
	const head = t.charAt(0).toUpperCase() + t.slice(1);
	return /[.!?]$/.test(head) ? head : `${head}.`;
}

function capital(text: string): string {
	return text.charAt(0).toUpperCase() + text.slice(1);
}

export const roleLabel: Record<TargetRole, string> = {
	call: "Contract call",
	delegatecall: "Runs as your account",
	delegation: "Account upgrade",
	"approval-spender": "Token approval",
	"permit-spender": "Permit signature",
};

const roleUse: Record<TargetRole, string> = {
	call: "a contract call",
	delegatecall: "code that runs as your account",
	delegation: "an account upgrade",
	"approval-spender": "a token approval",
	"permit-spender": "a permit signature",
};

export const severityLabel: Record<Severity, string> = {
	info: "Verified",
	amber: "Released recently",
	warning: "Not verified",
	critical: "Don't sign",
};

export const verdictLabel: Record<Verdict, string> = {
	VERIFIED: "Verified",
	"VERIFIED-unproven": "Not proven",
	"KEY REVOKED": "Key revoked",
	PULLED: "Pulled",
	MISMATCH: "Doesn't match",
	UNKNOWN: "Not released",
};

const strictRoles: TargetRole[] = ["delegation", "delegatecall"];
const good = (v: PublisherVerdict) =>
	v.verdict === "VERIFIED" || v.verdict === "VERIFIED-unproven";
const bad = (v: PublisherVerdict) =>
	v.verdict === "KEY REVOKED" ||
	v.verdict === "PULLED" ||
	v.verdict === "MISMATCH";

export function isStrict(role: TargetRole) {
	return strictRoles.includes(role);
}

function isProven(v: PublisherVerdict) {
	return v.verdict === "VERIFIED" && v.release?.proven === true;
}

function quoted(v: PublisherVerdict): string {
	return v.reason ? `${v.publisher} says: “${sentence(v.reason)}”` : "";
}

function version(v: PublisherVerdict) {
	return v.release ? `${v.release.component} ${v.release.version}` : "it";
}

export function explain(
	result: TargetResult,
	t: Thresholds,
): { title: string; body: string } {
	const { verdicts, target, severity } = result;
	const strict = isStrict(target.role);
	const minAge = formatDuration(t.delegateMinAgeSeconds);
	const use = roleUse[target.role];
	const pinnedBad = verdicts.find((v) => v.pinned && bad(v));
	const pinnedGood = bestVerdict(verdicts.filter((v) => v.pinned && good(v)));
	const vouch = verdicts.find((v) => !v.pinned && good(v));
	const dispute = verdicts.find((v) => !v.pinned && bad(v));

	if (pinnedBad) {
		const pub = pinnedBad.publisher;
		const why = pinnedBad.reason ? sentence(pinnedBad.reason) : "";
		if (pinnedBad.checkFailed === "network")
			return {
				title: `Couldn't finish checking ${pub}`,
				body: "Sepolia didn't answer every read, so treat this as unsafe. Run the check again in a moment.",
			};
		if (pinnedBad.checkFailed)
			return {
				title: `Couldn't finish checking ${pub}`,
				body: `${why} Treat this as unsafe until a check completes.`,
			};
		if (pinnedBad.verdict === "KEY REVOKED")
			return {
				title: `${pub} revoked the key that released this`,
				body: quoted(pinnedBad),
			};
		if (pinnedBad.verdict === "PULLED")
			return { title: `${pub} pulled this release`, body: quoted(pinnedBad) };
		if (!pinnedBad.key)
			return { title: `${pub} doesn't match your pin`, body: why };
		return {
			title: `The release record under ${pub} doesn't check out`,
			body: why,
		};
	}

	if (pinnedGood) {
		const pub = pinnedGood.publisher;
		const age = pinnedGood.release?.ageSeconds;
		const ago = age !== undefined ? ` ${formatDuration(age)} ago` : "";
		const what = version(pinnedGood);
		if (severity === "critical") {
			if (!isProven(pinnedGood))
				return {
					title: "The record could still be rewritten",
					body: `${pub} released ${what}${ago}, but ${use} needs a record that can't be changed, and this one isn't proven.`,
				};
			if (age === undefined)
				return {
					title: "Couldn't tell when this was released",
					body: `${pub} released ${what}, but ${use} needs a release at least ${minAge} old.`,
				};
			return {
				title: `Too new for ${use}`,
				body: `${pub} released ${what}${ago}. ${capital(use)} needs a release at least ${minAge} old, so a bad one can be pulled first. Check again later.`,
			};
		}
		if (severity === "warning")
			return {
				title: `Released by ${pub}, but the record could still be rewritten`,
				body: `${capital(what)}${ago ? `, released${ago}` : ""}. The record isn't proven to be write-once, so the publisher's release key might still change it.`,
			};
		if (severity === "amber")
			return {
				title: `Released by ${pub}${ago}`,
				body: `${capital(what)}. The record checks out, but give a new release some time before trusting it with much.`,
			};
		return {
			title: `Released by ${pub}`,
			body: `${capital(what)}${ago ? `, released${ago}` : ""}. The record can't be changed and the key is still active.`,
		};
	}

	if (vouch)
		return {
			title: `Vouched for by ${vouch.publisher}, a publisher you haven't pinned`,
			body: strict
				? `Anyone can register a name. Pin ${vouch.publisher} only if you trust it, then check again.`
				: `Anyone can register a name, so this alone doesn't make it safe. Pin ${vouch.publisher} if you trust it.`,
		};

	if (dispute)
		return {
			title: `${dispute.publisher} disputes this address`,
			body: `${dispute.publisher} isn't one of your pinned publishers. ${quoted(dispute)}`.trim(),
		};

	if (result.error && verdicts.length === 0)
		return {
			title: "Couldn't finish the check",
			body: `${sentence(result.error)} Run the check again in a moment.`,
		};

	if (result.indexUnavailable || result.indexIncomplete)
		return {
			title: "Couldn't find a publisher for this contract",
			body: strict
				? "Nothing ties this code to a team's ENS name yet, and the search for publishers didn't finish. Don't hand your account to it."
				: "Nothing ties this contract to a team's ENS name yet, but the search for publishers didn't finish.",
		};

	return {
		title: "No publisher released this contract",
		body: strict
			? "Nothing ties this code to a team's ENS name. Don't hand your account to it."
			: "Nothing ties this contract to a team's ENS name.",
	};
}

export type Notice = { tone: "neutral" | "warning" | "error"; text: string };

export function notices(result: TargetResult): Notice[] {
	const out: Notice[] = [];
	if (result.error && result.verdicts.length > 0)
		out.push({
			tone: "error",
			text: `Part of this check didn't finish: ${result.error}`,
		});
	if (result.indexUnavailable)
		out.push({
			tone: "warning",
			text: "Couldn't search for other publishers, so only the ones you pinned were checked.",
		});
	if (result.indexIncomplete)
		out.push({
			tone: "neutral",
			text: "The search for other publishers was incomplete, so more may exist.",
		});
	if (result.indexFlooded)
		out.push({
			tone: "warning",
			text: "Too many publishers matched this address. Anything you haven't pinned can't raise this result above a warning.",
		});
	if (result.skippedPublishers?.length)
		out.push({
			tone: "neutral",
			text: `Not checked, to keep the check fast: ${result.skippedPublishers.join(", ")}.`,
		});
	return out;
}

export type StepState = "ok" | "caution" | "fail" | "open";
export type StepId = "publisher" | "key" | "release" | "record" | "age";
export type Step = {
	id: StepId;
	label: string;
	value?: string;
	note: string;
	state: StepState;
};

const stepOrder: StepId[] = ["publisher", "key", "release", "record", "age"];

function failingStep(v: PublisherVerdict): StepId | undefined {
	if (v.verdict === "KEY REVOKED") return "key";
	if (v.verdict === "PULLED") return "release";
	if (v.verdict === "MISMATCH") return v.key ? "record" : "publisher";
	return undefined;
}

export function trustPath(
	v: PublisherVerdict,
	role: TargetRole,
	t: Thresholds,
): Step[] {
	const r = v.release;
	const proven = isProven(v);
	const fail = failingStep(v);
	const strict = isStrict(role);
	const reason = v.reason ? sentence(v.reason) : "";
	const steps: Step[] = [
		{
			id: "publisher",
			label: "Publisher",
			value: v.publisher,
			note:
				fail === "publisher"
					? v.checkFailed === "network"
						? "Sepolia didn't answer every read, so this couldn't be verified."
						: reason
					: v.pinned
						? "You pinned this publisher."
						: "You haven't pinned this publisher.",
			state: fail === "publisher" ? "fail" : v.pinned ? "ok" : "caution",
		},
		{
			id: "key",
			label: "Release key",
			value: v.key,
			note:
				fail === "key"
					? quoted(v) || "The publisher revoked this key."
					: v.key
						? `Still active under ${v.publisher}.`
						: "",
			state: fail === "key" ? "fail" : v.key ? "ok" : "open",
		},
		{
			id: "release",
			label: "Release",
			value: r?.name,
			note:
				fail === "release"
					? quoted(v) || "The publisher pulled this release."
					: r
						? `${r.component} ${r.version}, released as a ${r.kind}.`
						: "",
			state: fail === "release" ? "fail" : r ? "ok" : "open",
		},
		{
			id: "record",
			label: "Record",
			note:
				fail === "record"
					? reason
					: !r
						? ""
						: proven
							? "Can't be changed after release."
							: "Not proven to be write-once, so it could still change.",
			state:
				fail === "record"
					? "fail"
					: !r
						? "open"
						: proven
							? "ok"
							: strict
								? "fail"
								: "caution",
		},
		{
			id: "age",
			label: "Age",
			value:
				r?.ageSeconds !== undefined ? formatDuration(r.ageSeconds) : undefined,
			note: r ? ageNote(r.ageSeconds, role, t) : "",
			state: ageState(r?.ageSeconds, strict, t),
		},
	];
	const capped = v.pinned
		? steps
		: steps.map((s) =>
				s.state === "ok" ? { ...s, state: "caution" as StepState } : s,
			);
	if (!fail) return capped;
	const stop = stepOrder.indexOf(fail);
	return capped.map((s, i) =>
		i > stop
			? {
					...s,
					state: "open",
					note: "Not checked, because an earlier step failed.",
				}
			: s,
	);
}

function ageNote(
	age: number | undefined,
	role: TargetRole,
	t: Thresholds,
): string {
	if (age === undefined) return "Couldn't read when it was released.";
	if (isStrict(role))
		return age < t.delegateMinAgeSeconds
			? `${capital(roleUse[role])} needs a release at least ${formatDuration(t.delegateMinAgeSeconds)} old.`
			: `Older than the ${formatDuration(t.delegateMinAgeSeconds)} minimum for ${roleUse[role]}.`;
	return age < t.freshCallAgeSeconds
		? "New release. Give it time before trusting it with much."
		: `Older than the ${formatDuration(t.freshCallAgeSeconds)} wait for new releases.`;
}

function ageState(
	age: number | undefined,
	strict: boolean,
	t: Thresholds,
): StepState {
	if (age === undefined) return strict ? "fail" : "open";
	if (strict && age < t.delegateMinAgeSeconds) return "fail";
	if (!strict && age < t.freshCallAgeSeconds) return "caution";
	return "ok";
}
