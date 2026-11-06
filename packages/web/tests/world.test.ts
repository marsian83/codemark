import { describe, expect, test } from "bun:test";
import {
	footPhase,
	foxSpeed,
	plantedFootX,
	solveJoint,
	stanceShare,
	strideSeconds,
} from "../src/pages/landing/world/fox";
import { groundAt, groundSlopeAt } from "../src/pages/landing/world/ground";
import {
	leapAt,
	leapHeight,
	type Stone,
	signalAt,
	skyAt,
	stonesAt,
} from "../src/pages/landing/world/journey";

const viewport = { width: 1600, height: 900, maxScroll: 9000 };

describe("skyAt", () => {
	test("opens at dusk with the land in view", () => {
		const sky = skyAt(0, viewport);
		expect(sky.lift).toBe(0);
		expect(sky.night).toBe(0);
		expect(sky.dawn).toBe(0);
	});

	test("lowers the land on a short screen to leave room for the text", () => {
		const sky = skyAt(0, { width: 1280, height: 720, maxScroll: 9000 });
		expect(sky.lift).toBeGreaterThan(0);
	});

	test("is full night mid journey, with the land out of view", () => {
		const sky = skyAt(4500, viewport);
		expect(sky.lift).toBe(1);
		expect(sky.night).toBe(1);
		expect(sky.dawn).toBe(0);
	});

	test("ends at dawn with the land back in view", () => {
		const sky = skyAt(viewport.maxScroll, viewport);
		expect(sky.lift).toBe(0);
		expect(sky.night).toBe(0);
		expect(sky.dawn).toBe(1);
	});

	test("handles a page shorter than the rise", () => {
		const sky = skyAt(100, { ...viewport, maxScroll: 200 });
		expect(sky.lift).toBeGreaterThanOrEqual(0);
		expect(sky.dawn).toBeLessThanOrEqual(1);
	});
});

const spacing = 2.2;
const unit = 0.2;

describe("stonesAt", () => {
	test("keeps three stones, with at most one past the left edge", () => {
		for (const travel of [0, 0.5, 3.1, 40]) {
			const stones = stonesAt(travel, spacing);
			expect(stones).toHaveLength(3);
			expect(stones.filter((stone) => stone.x < 0).length).toBeLessThan(2);
		}
	});

	test("stands every stone on the ground", () => {
		const travel = 2;
		for (const stone of stonesAt(travel, spacing)) {
			expect(stone.base).toBeCloseTo(groundAt(stone.x + travel), 6);
		}
	});
});

describe("signalAt", () => {
	const stones: Stone[] = [
		{ x: 0.2, base: 0, kind: "verified" },
		{ x: 1.4, base: 0, kind: "revoked" },
		{ x: 3.6, base: 0, kind: "verified" },
	];

	test("names the next stone once it's within sight", () => {
		expect(signalAt(stones, 0.7, 1)).toBe("revoked");
	});

	test("holds the last stone until the next one is in sight", () => {
		expect(signalAt(stones, 0.7, 0.3)).toBe("verified");
	});
});

describe("leapAt", () => {
	const revokedWorld = 2 * spacing;

	test("clears the revoked stone at the top of the arc", () => {
		expect(leapAt(revokedWorld, spacing, unit).lift).toBe(leapHeight);
	});

	test("rises nose up and lands nose down", () => {
		expect(leapAt(revokedWorld - 0.1, spacing, unit).pitch).toBeLessThan(0);
		expect(leapAt(revokedWorld + 0.1, spacing, unit).pitch).toBeGreaterThan(0);
	});

	test("stays on the ground around verified stones", () => {
		expect(leapAt(spacing, spacing, unit).lift).toBe(0);
		expect(leapAt(spacing * 3, spacing, unit).lift).toBe(0);
	});

	test("lands well before the next stone", () => {
		expect(leapAt(revokedWorld + 0.5, spacing, unit).lift).toBe(0);
		expect(leapAt(revokedWorld - 0.5, spacing, unit).lift).toBe(0);
	});
});

describe("fox gait", () => {
	test("a planted foot moves back exactly as fast as the ground", () => {
		const center = 0.1;
		const footTravel = plantedFootX(center, 0) - plantedFootX(center, 1);
		const stanceSeconds = strideSeconds * stanceShare;
		expect(footTravel / stanceSeconds).toBeCloseTo(foxSpeed, 6);
	});

	test("every foot spends a third of the stride on the ground", () => {
		for (const offset of [0, -0.08, -0.34, -0.42]) {
			const samples = Array.from({ length: 1000 }, (_, index) =>
				footPhase(index / 1000, offset),
			);
			const planted = samples.filter((foot) => foot.planted).length;
			expect(planted).toBeCloseTo(310, -1);
		}
	});

	test("the joint keeps both bone lengths while the target is in reach", () => {
		const from = [0, 0] as const;
		const to = [0.1, 0.4] as const;
		const joint = solveJoint(from, to, 0.27, 0.26, -1);
		expect(Math.hypot(joint[0], joint[1])).toBeCloseTo(0.27, 6);
		expect(Math.hypot(joint[0] - to[0], joint[1] - to[1])).toBeCloseTo(0.26, 6);
	});

	test("knees bend forward and elbows bend back", () => {
		const knee = solveJoint([0, 0], [0, 0.4], 0.27, 0.26, -1);
		const elbow = solveJoint([0, 0], [0, 0.4], 0.25, 0.255, 1);
		expect(knee[0]).toBeGreaterThan(0);
		expect(elbow[0]).toBeLessThan(0);
	});
});

test("groundSlopeAt matches the ground it describes", () => {
	const step = 0.0001;
	for (const x of [0, 0.7, 2.3]) {
		const measured = (groundAt(x + step) - groundAt(x - step)) / (2 * step);
		expect(groundSlopeAt(x)).toBeCloseTo(measured, 4);
	}
});
