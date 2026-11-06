import { describe, expect, test } from "bun:test";
import { decide, defaultThresholds } from "@codemark/shared/check/severity";
import { incidents } from "../src/pages/landing/replay/incidents";
import {
	cellFlight,
	endOfStep,
	laneState,
	stepAt,
	stepCount,
} from "../src/pages/landing/replay/timeline";

const samples = Array.from({ length: 101 }, (_, index) => index / 100);

describe("replay timeline", () => {
	test("the open lane ends fully drained", () => {
		expect(laneState(false, 0).drained).toBe(0);
		expect(laneState(false, 1).drained).toBe(1);
	});

	test("the guarded lane never loses anything", () => {
		for (const t of samples) {
			const state = laneState(true, t);
			expect(state.drained).toBe(0);
			expect(state.compromised).toBe(0);
		}
	});

	test("the drain only starts on the last step", () => {
		for (const t of samples) {
			if (stepAt(t) < stepCount - 1) {
				expect(laneState(false, t).drained).toBe(0);
			}
		}
	});

	test("seeking lands on the requested step", () => {
		for (let step = 0; step < stepCount; step++) {
			expect(stepAt(endOfStep(step))).toBe(step);
		}
	});
});

describe("incident verdicts", () => {
	test("every incident has one entry per timeline step", () => {
		for (const incident of incidents) {
			expect(incident.steps).toHaveLength(stepCount);
		}
	});

	test("seeking to the last step shows the finished drain", () => {
		expect(laneState(false, endOfStep(stepCount - 1)).drained).toBe(1);
	});

	test("every replayed target is critical in the real decision function", () => {
		for (const incident of incidents) {
			const verdict = decide(incident.role, [], defaultThresholds);
			expect(verdict.severity).toBe("critical");
			expect(verdict.headline).toBe(
				"Unknown: no publisher claims this address",
			);
		}
	});
});

describe("vault cells", () => {
	test("every cell has finished flying when the drain ends", () => {
		for (const order of samples) {
			expect(cellFlight(order, 1)).toBe(1);
		}
	});

	test("no cell has left before the drain starts", () => {
		for (const order of samples) {
			expect(cellFlight(order, 0)).toBe(0);
		}
	});
});

describe("replay script", () => {
	test("the guarded lane flags the payload before the takeover step", () => {
		expect(laneState(true, 0.6).flagged).toBe(1);
	});

	test("the guarded lane ends with the wallet marked safe", () => {
		expect(laneState(true, 1).kept).toBe(1);
	});

	test("every incident has one caption per step and a short payload tag", () => {
		for (const incident of incidents) {
			expect(incident.steps).toHaveLength(stepCount);
			expect(incident.payload.length).toBeLessThan(30);
		}
	});
});
