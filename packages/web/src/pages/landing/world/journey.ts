import { clamp01, smoothstep } from "../art/noise";
import { groundAt } from "./ground";

export type Viewport = { width: number; height: number; maxScroll: number };

export type Sky = {
	lift: number;
	night: number;
	dawn: number;
	journey: number;
	sunX: number;
	sunY: number;
};

const riseScreens = 0.92;
const shortScreen = 900;
const shortScreenDrop = 0.09;

function mix(from: number, to: number, amount: number): number {
	return from + (to - from) * amount;
}

export function skyAt(scrollY: number, viewport: Viewport): Sky {
	const { height, width, maxScroll } = viewport;
	const descent = smoothstep(0, 1, clamp01(scrollY / (height * 0.7)));
	const riseFrom = maxScroll - height * riseScreens;
	const rise = smoothstep(
		0,
		1,
		clamp01((scrollY - riseFrom) / (height * riseScreens)),
	);
	const aspect = width / height;
	const drop = clamp01((shortScreen - height) / 180) * shortScreenDrop;
	return {
		lift: (descent + drop * (1 - descent)) * (1 - rise),
		night: descent * (1 - rise),
		dawn: rise,
		journey: clamp01(scrollY / Math.max(1, maxScroll)),
		sunX: aspect * (aspect < 1 ? 0.62 : 0.76),
		sunY: mix(
			mix(aspect < 1 ? 0.3 : 0.4, -0.3, descent),
			aspect < 1 ? 0.34 : 0.47,
			rise,
		),
	};
}

export type StoneKind = "verified" | "revoked";

export type Stone = {
	x: number;
	base: number;
	kind: StoneKind;
};

const stoneKinds: StoneKind[] = ["verified", "revoked", "verified"];

function kindAt(index: number): StoneKind {
	return stoneKinds[((index % 3) + 3) % 3];
}

export function stonesAt(travel: number, spacing: number): Stone[] {
	const first = Math.floor(travel / spacing) - 1;
	return [0, 1, 2].map((offset) => {
		const index = first + offset;
		const world = (index + 1) * spacing;
		return {
			x: world - travel,
			base: groundAt(world),
			kind: kindAt(index),
		};
	});
}

export function signalAt(
	stones: Stone[],
	foxX: number,
	lookahead: number,
): StoneKind {
	const passed = stones.filter((stone) => stone.x < foxX);
	const ahead = stones.find(
		(stone) => stone.x >= foxX && stone.x - foxX <= lookahead,
	);
	return ahead?.kind ?? passed[passed.length - 1]?.kind ?? "verified";
}

export const leapHeight = 1.2;
const leapReach = 1.4;

export type Leap = { lift: number; pitch: number };

export function leapAt(foxWorld: number, spacing: number, unit: number): Leap {
	const index = Math.round(foxWorld / spacing - 1);
	if (kindAt(index) !== "revoked") return { lift: 0, pitch: 0 };
	const along = (foxWorld - (index + 1) * spacing) / (leapReach * unit);
	if (Math.abs(along) >= 1) return { lift: 0, pitch: 0 };
	return {
		lift: leapHeight * (1 - along * along),
		pitch: 0.34 * along * (1 - along ** 4),
	};
}
