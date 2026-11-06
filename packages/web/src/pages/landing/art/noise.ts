export function hash(x: number, y: number, seed = 0): number {
	let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + seed;
	h = Math.imul(h ^ (h >>> 13), 1274126177);
	return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function clamp01(value: number): number {
	return Math.min(1, Math.max(0, value));
}

export function smoothstep(from: number, to: number, value: number): number {
	const t = clamp01((value - from) / (to - from));
	return t * t * (3 - 2 * t);
}

function valueNoise(x: number, y: number, seed: number): number {
	const left = Math.floor(x);
	const top = Math.floor(y);
	const u = smoothstep(0, 1, x - left);
	const v = smoothstep(0, 1, y - top);
	const upper = hash(left, top, seed) * (1 - u) + hash(left + 1, top, seed) * u;
	const lower =
		hash(left, top + 1, seed) * (1 - u) + hash(left + 1, top + 1, seed) * u;
	return upper * (1 - v) + lower * v;
}

export function fractalNoise(x: number, y: number, seed = 0): number {
	let total = 0;
	let weight = 0.5;
	let frequency = 1;
	for (let octave = 0; octave < 5; octave++) {
		total += weight * valueNoise(x * frequency, y * frequency, seed + octave);
		weight /= 2;
		frequency *= 2;
	}
	return total / 0.96875;
}
