import { hash } from "../art/noise";

type Point = readonly [number, number];
type Pen = CanvasRenderingContext2D;

const palette = {
	bright: "#f6851b",
	orange: "#e4761b",
	mid: "#e2761b",
	deep: "#cd6116",
	umber: "#763d16",
	cream: "#d7c1b3",
	stone: "#c0ad9e",
	navy: "#233447",
	black: "#161616",
};

const tau = Math.PI * 2;

export const foxSpeed = 5;
export const strideSeconds = 0.38;
export const stanceShare = 0.31;
const sweep = foxSpeed * strideSeconds * stanceShare;

export const foxCanvasSize = { width: 960, height: 720 };
export const foxFootLine = 0.86;
export const foxPixelsPerUnit = 250;
export const foxOriginX = 0.56;

const hipHeight = 0.6;
const shoulderHeight = 0.58;
const bodyHalf = 0.46;

function add(a: Point, b: Point): Point {
	return [a[0] + b[0], a[1] + b[1]];
}

function mix(a: number, b: number, t: number): number {
	return a + (b - a) * t;
}

function mixPoint(a: Point, b: Point, t: number): Point {
	return [mix(a[0], b[0], t), mix(a[1], b[1], t)];
}

function ease(t: number): number {
	return t * t * (3 - 2 * t);
}

function facet(pen: Pen, color: string, ...points: Point[]) {
	pen.beginPath();
	pen.moveTo(points[0][0], points[0][1]);
	for (const point of points.slice(1)) pen.lineTo(point[0], point[1]);
	pen.closePath();
	pen.fillStyle = color;
	pen.strokeStyle = color;
	pen.lineWidth = 0.005;
	pen.lineJoin = "round";
	pen.fill();
	pen.stroke();
}

function limb(
	pen: Pen,
	from: Point,
	to: Point,
	fromWidth: number,
	toWidth: number,
	color: string,
) {
	const dx = to[0] - from[0];
	const dy = to[1] - from[1];
	const length = Math.hypot(dx, dy) || 1;
	const nx = -dy / length;
	const ny = dx / length;
	facet(
		pen,
		color,
		[from[0] + nx * fromWidth, from[1] + ny * fromWidth],
		[from[0] - nx * fromWidth, from[1] - ny * fromWidth],
		[to[0] - nx * toWidth, to[1] - ny * toWidth],
		[to[0] + nx * toWidth, to[1] + ny * toWidth],
	);
}

export function solveJoint(
	from: Point,
	to: Point,
	first: number,
	second: number,
	bend: number,
): Point {
	const dx = to[0] - from[0];
	const dy = to[1] - from[1];
	const reach = Math.hypot(dx, dy) || 0.0001;
	const span = Math.min(first + second - 0.001, reach);
	const along = (first * first - second * second + span * span) / (2 * span);
	const rise = Math.sqrt(Math.max(0, first * first - along * along));
	const ux = dx / reach;
	const uy = dy / reach;
	return [
		from[0] + ux * along - uy * rise * bend,
		from[1] + uy * along + ux * rise * bend,
	];
}

export type FootPhase = { planted: boolean; progress: number };

export function footPhase(phase: number, offset: number): FootPhase {
	const local = (phase + offset + 1) % 1;
	return local < stanceShare
		? { planted: true, progress: local / stanceShare }
		: { planted: false, progress: (local - stanceShare) / (1 - stanceShare) };
}

export function plantedFootX(center: number, progress: number): number {
	return center + sweep / 2 - sweep * progress;
}

type Ground = (x: number) => number;

function footAt(
	center: number,
	foot: FootPhase,
	lift: number,
	ground: Ground,
): Point {
	if (foot.planted) {
		const x = plantedFootX(center, foot.progress);
		return [x, ground(x)];
	}
	const x = center - sweep / 2 + sweep * ease(foot.progress);
	return [x, ground(x) - lift * Math.sin(foot.progress * Math.PI) ** 0.85];
}

function ankleTilt(
	foot: FootPhase,
	landing: number,
	liftOff: number,
	folded: number,
) {
	if (foot.planted) return mix(landing, liftOff, foot.progress);
	const t = foot.progress;
	return t < 0.5
		? mix(liftOff, folded, ease(t * 2))
		: mix(folded, landing, ease((t - 0.5) * 2));
}

function above(point: Point, tilt: number, length: number): Point {
	return [
		point[0] - Math.sin(tilt) * length,
		point[1] - Math.cos(tilt) * length,
	];
}

function paw(pen: Pen, ankle: Point, at: Point, color: string) {
	limb(pen, ankle, at, 0.025, 0.021, color);
	limb(pen, at, add(at, [0.06, 0.004]), 0.022, 0.012, palette.navy);
}

type LegColors = { upper: string; lower: string; sock: string };

const nearLeg: LegColors = {
	upper: palette.orange,
	lower: palette.deep,
	sock: palette.umber,
};
const farLeg: LegColors = {
	upper: palette.deep,
	lower: palette.umber,
	sock: palette.navy,
};

function drawHind(
	pen: Pen,
	hip: Point,
	target: Point,
	tilt: number,
	colors: LegColors,
) {
	const hock = above(target, tilt, 0.195);
	const knee = solveJoint(hip, hock, 0.27, 0.26, -1);
	limb(pen, hip, knee, 0.09, 0.044, colors.upper);
	limb(pen, knee, hock, 0.044, 0.025, colors.lower);
	paw(pen, hock, target, colors.sock);
}

function drawFore(
	pen: Pen,
	shoulder: Point,
	target: Point,
	tilt: number,
	colors: LegColors,
) {
	const wrist = above(target, tilt, 0.085);
	const elbow = solveJoint(shoulder, wrist, 0.25, 0.255, 1);
	limb(pen, shoulder, elbow, 0.074, 0.038, colors.upper);
	limb(pen, elbow, wrist, 0.038, 0.024, colors.lower);
	paw(pen, wrist, target, colors.sock);
}

function drawTail(pen: Pen, root: Point, phase: number, pitch: number) {
	const segments = 8;
	const points: Point[] = [root];
	let angle = Math.PI + 0.26 + pitch * 0.6;
	for (let index = 0; index < segments; index++) {
		angle -= 0.015;
		angle += 0.055 * Math.sin(tau * (phase - index * 0.08));
		const previous = points[points.length - 1];
		points.push(
			add(previous, [Math.cos(angle) * 0.098, Math.sin(angle) * 0.098]),
		);
	}
	const widthAt = (index: number) => {
		const t = index / segments;
		return 0.025 + 0.075 * Math.sin(Math.min(1, t * 1.14) * Math.PI) ** 0.75;
	};
	const normal = (index: number): Point => {
		const from = points[Math.max(0, index - 1)];
		const to = points[Math.min(segments, index + 1)];
		const length = Math.hypot(to[0] - from[0], to[1] - from[1]) || 1;
		return [-(to[1] - from[1]) / length, (to[0] - from[0]) / length];
	};
	for (let index = 0; index < segments; index++) {
		const n0 = normal(index);
		const n1 = normal(index + 1);
		const w0 = widthAt(index);
		const w1 = index === segments - 1 ? 0.001 : widthAt(index + 1);
		const p0 = points[index];
		const p1 = points[index + 1];
		const a: Point = [p0[0] + n0[0] * w0, p0[1] + n0[1] * w0];
		const b: Point = [p0[0] - n0[0] * w0, p0[1] - n0[1] * w0];
		const c: Point = [p1[0] + n1[0] * w1, p1[1] + n1[1] * w1];
		const d: Point = [p1[0] - n1[0] * w1, p1[1] - n1[1] * w1];
		const tip = index >= segments - 2;
		facet(pen, tip ? palette.stone : palette.deep, a, c, p1);
		facet(pen, tip ? palette.stone : palette.deep, a, p1, p0);
		facet(pen, tip ? palette.cream : palette.bright, b, p0, p1);
		facet(pen, tip ? palette.cream : palette.orange, b, p1, d);
	}
}

function drawHead(pen: Pen, base: Point, pitch: number) {
	pen.save();
	pen.translate(base[0], base[1]);
	pen.rotate(pitch);
	pen.scale(1.28, 1.28);
	const crown: Point = [0.085, -0.105];
	const brow: Point = [0.165, -0.062];
	const back: Point = [-0.03, -0.07];
	const snout: Point = [0.285, -0.008];
	const nose: Point = [0.335, 0.016];
	const chin: Point = [0.285, 0.044];
	const jaw: Point = [0.13, 0.078];
	const throat: Point = [-0.02, 0.08];
	const cheek: Point = [0.09, 0.012];
	const lip: Point = [0.205, 0.018];

	facet(pen, palette.umber, [0.0, -0.075], [-0.085, -0.235], [0.05, -0.1]);
	facet(pen, palette.deep, [0.03, -0.09], [-0.03, -0.262], [0.115, -0.095]);
	facet(pen, palette.bright, [0.06, -0.095], [-0.03, -0.262], [0.115, -0.095]);
	facet(pen, palette.navy, [-0.012, -0.21], [-0.03, -0.262], [0.015, -0.218]);

	facet(pen, palette.orange, back, cheek, throat);
	facet(pen, palette.bright, back, crown, cheek);
	facet(pen, palette.bright, crown, brow, cheek);
	facet(pen, palette.mid, brow, snout, cheek);
	facet(pen, palette.bright, brow, snout, [0.2, -0.03]);
	facet(pen, palette.deep, cheek, snout, lip);
	facet(pen, palette.cream, cheek, lip, jaw);
	facet(pen, palette.cream, lip, snout, chin);
	facet(pen, palette.stone, lip, chin, jaw);
	facet(pen, palette.stone, throat, cheek, jaw);
	facet(pen, palette.navy, snout, nose, [0.305, 0.03]);
	facet(pen, palette.navy, [0.118, -0.052], [0.178, -0.032], [0.128, -0.022]);
	pen.restore();
}

function drawDust(
	pen: Pen,
	distance: number,
	ground: Ground,
	airborne: (x: number) => boolean,
) {
	const spacing = foxSpeed * strideSeconds;
	const newest = Math.floor(distance / spacing);
	for (let anchor = newest; anchor > newest - 7; anchor--) {
		const rel = anchor * spacing - distance - 0.32;
		if (airborne(rel)) continue;
		for (let grain = 0; grain < 7; grain++) {
			const seedA = hash(anchor, grain, 3);
			const seedB = hash(anchor, grain, 5);
			const age = Math.min(1, -rel / (1.8 + seedA * 1.4));
			if (age <= 0 || age >= 1) continue;
			const x = rel + (seedA - 0.5) * 0.24;
			const y = ground(x) - age * (0.04 + seedB * 0.26);
			const size = (0.012 + seedB * 0.016) * (1 - age * 0.5);
			pen.globalAlpha = (1 - age) * 0.8;
			pen.fillStyle = grain % 3 ? palette.cream : palette.stone;
			pen.fillRect(x, y, size, size);
		}
	}
	pen.globalAlpha = 1;
}

export type FoxFrame = {
	phase: number;
	distance: number;
	leap: { lift: number; pitch: number };
	ground: Ground;
	airborne: (x: number) => boolean;
};

export function drawFox(
	pen: Pen,
	{ phase, distance, leap, ground, airborne }: FoxFrame,
) {
	pen.save();
	pen.clearRect(0, 0, foxCanvasSize.width, foxCanvasSize.height);
	pen.translate(
		foxCanvasSize.width * foxOriginX,
		foxCanvasSize.height * foxFootLine,
	);
	pen.scale(foxPixelsPerUnit, foxPixelsPerUnit);

	drawDust(pen, distance, ground, airborne);

	const flight = ease(Math.min(1, leap.lift / 0.3));
	const stretch = Math.cos(tau * (phase - 0.33));
	const bob = -0.042 * Math.cos(tau * (phase - 0.86));
	const rock = 0.075 * Math.cos(tau * (phase - 0.18));
	const half = bodyHalf + 0.024 * stretch * (1 - flight);
	const hipGround = ground(-bodyHalf);
	const shoulderGround = ground(bodyHalf);
	const slope = Math.atan2(shoulderGround - hipGround, bodyHalf * 2);
	const pitch = slope + (-rock * (1 - flight) + leap.pitch);
	const centerY =
		(hipGround + shoulderGround) / 2 -
		(hipHeight + shoulderHeight) / 2 +
		bob * (1 - flight) -
		leap.lift;
	const cos = Math.cos(pitch);
	const sin = Math.sin(pitch);
	const place = (x: number, y: number): Point => [
		x * cos - y * sin,
		centerY + x * sin + y * cos,
	];

	const hip = place(-half + 0.02, 0.03);
	const hipFar = place(-half + 0.05, 0.02);
	const shoulder = place(half - 0.02, 0.1);
	const shoulderFar = place(half - 0.05, 0.09);

	const stride = (foot: FootPhase, center: number, lift: number) =>
		footAt(center, foot, lift, ground);
	const hindCenter = -bodyHalf + 0.02;
	const foreCenter = bodyHalf + 0.05;

	const hindFarFoot = footPhase(phase, 0);
	const hindNearFoot = footPhase(phase, -0.08);
	const foreFarFoot = footPhase(phase, -0.34);
	const foreNearFoot = footPhase(phase, -0.42);

	const tuck = (gait: Point, air: Point): Point => mixPoint(gait, air, flight);
	const hindAir: Point = [-0.32, 0.5];
	const foreAir: Point = [0.36, 0.42];

	const hindFarTarget = tuck(
		stride(hindFarFoot, hindCenter + 0.05, 0.2),
		add(hipFar, add(hindAir, [0.05, -0.04])),
	);
	const hindNearTarget = tuck(
		stride(hindNearFoot, hindCenter, 0.2),
		add(hip, hindAir),
	);
	const foreFarTarget = tuck(
		stride(foreFarFoot, foreCenter - 0.05, 0.24),
		add(shoulderFar, add(foreAir, [-0.06, -0.03])),
	);
	const foreNearTarget = tuck(
		stride(foreNearFoot, foreCenter, 0.24),
		add(shoulder, foreAir),
	);

	const hindTilt = (foot: FootPhase) =>
		mix(ankleTilt(foot, 0.3, -0.72, -1.1), -0.95, flight);
	const foreTilt = (foot: FootPhase) =>
		mix(ankleTilt(foot, 0.1, -0.55, -1.5), 0.4, flight);

	drawHind(pen, hipFar, hindFarTarget, hindTilt(hindFarFoot), farLeg);
	drawFore(pen, shoulderFar, foreFarTarget, foreTilt(foreFarFoot), farLeg);
	drawTail(pen, place(-half - 0.09, -0.06), phase, pitch);

	const spine = (t: number, y: number): Point => place(mix(-half, half, t), y);
	const rump = place(-half - 0.13, -0.03);
	const backA = spine(0.02, -0.13);
	const backB = spine(0.34, -0.14);
	const backC = spine(0.68, -0.12);
	const backD = spine(1, -0.14);
	const midA = spine(0.02, 0);
	const midB = spine(0.34, -0.03);
	const midC = spine(0.68, -0.01);
	const midD = spine(1, 0.01);
	const lowA = spine(0.02, 0.11);
	const lowB = spine(0.34, 0.075);
	const lowC = spine(0.68, 0.115);
	const lowD = spine(1, 0.19);

	facet(pen, palette.orange, rump, backA, midA);
	facet(pen, palette.deep, rump, midA, lowA);
	facet(pen, palette.bright, backA, backB, midB, midA);
	facet(pen, palette.bright, backB, backC, midC, midB);
	facet(pen, palette.bright, backC, backD, midD, midC);
	facet(pen, palette.orange, midA, midB, lowB, lowA);
	facet(pen, palette.orange, midB, midC, lowC, lowB);
	facet(pen, palette.mid, midC, midD, lowD, lowC);
	facet(pen, palette.deep, lowA, lowB, spine(0.2, 0.12));
	facet(pen, palette.cream, lowB, lowC, spine(0.5, 0.135));
	facet(pen, palette.cream, lowC, lowD, spine(0.84, 0.185));

	const neckTop = place(half + 0.1, -0.21);
	const neckFront = place(half + 0.17, -0.04);
	const chest = place(half + 0.12, 0.13);
	facet(pen, palette.bright, backC, backD, neckTop);
	facet(pen, palette.orange, backD, neckFront, neckTop);
	facet(pen, palette.mid, backD, midD, neckFront);
	facet(pen, palette.cream, midD, lowD, chest, neckFront);

	drawHind(pen, hip, hindNearTarget, hindTilt(hindNearFoot), nearLeg);
	drawFore(pen, shoulder, foreNearTarget, foreTilt(foreNearFoot), nearLeg);

	const headBase = place(half + 0.14, -0.2);
	drawHead(pen, headBase, -pitch * 0.45 + 0.04 + leap.pitch * 0.4);
	pen.restore();
}
