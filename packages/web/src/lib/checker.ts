import { createArkivSource } from "@codemark/shared/arkiv/source";
import {
	type CheckResult,
	checkTargets,
	type Pin,
	type Target,
} from "@codemark/shared/check";
import type { Thresholds } from "@codemark/shared/check/severity";
import { config } from "./config";
import { arkivReader, ens } from "./rpc";

const retryDelaysMs = [1000, 2000, 4000];

export function isUnfinished(result: CheckResult) {
	return result.results.some(
		(r) =>
			r.error !== undefined ||
			r.indexUnavailable === true ||
			r.verdicts.some((v) => v.checkFailed !== undefined),
	);
}

export async function retryUntilFinished<T>(
	run: () => Promise<T>,
	unfinished: (value: T) => boolean,
	delaysMs: number[] = retryDelaysMs,
): Promise<T> {
	for (const delay of delaysMs) {
		try {
			const value = await run();
			if (!unfinished(value)) return value;
		} catch {}
		await new Promise((resolve) => setTimeout(resolve, delay));
	}
	return run();
}

export async function runCheck(
	targets: Target[],
	pins: Pin[],
	thresholds: Thresholds = config.thresholds,
): Promise<{ result: CheckResult; now: number }> {
	const now = Math.floor(Date.now() / 1000);
	const arkiv = createArkivSource(arkivReader);
	const result = await retryUntilFinished(
		() => checkTargets({ targets, pins }, { ens, arkiv, now, ...thresholds }),
		isUnfinished,
	);
	return { result, now };
}
