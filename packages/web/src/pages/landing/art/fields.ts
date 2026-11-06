import type { LightField } from "./dither";

const tau = Math.PI * 2;

function box(
	x: number,
	y: number,
	cx: number,
	cy: number,
	hw: number,
	hh: number,
) {
	return Math.max(Math.abs(x - cx) - hw, Math.abs(y - cy) - hh);
}

function sweep(x: number, y: number, seconds: number) {
	return 0.5 + 0.5 * Math.sin((x + y) * 7 - seconds * 1.8);
}

export const safeField: LightField = (x, y, seconds) => {
	const body = box(x, y, 0.5, 0.5, 0.4, 0.4);
	if (body > 0) return 0;
	const dx = x - 0.5;
	const dy = y - 0.5;
	const radius = Math.hypot(dx, dy);
	if (body > -0.03) return 0.95;
	if (radius > 0.235 && radius < 0.275) return 1;
	if (radius < 0.235) {
		const turn = Math.sin(seconds * 1.1) * 2.4;
		const angle = Math.atan2(dy, dx) - turn;
		const spoke = Math.abs(Math.sin(angle * 1.5)) * radius;
		if (radius < 0.05) return 1;
		if (spoke < 0.022 && radius < 0.2) return 1;
		return 0.12;
	}
	return 0.2 + 0.42 * sweep(x, y, seconds) * (1 - (x + y) * 0.4);
};

export const pipelineField: LightField = (x, y, seconds) => {
	const stations = [0.17, 0.5, 0.83];
	const lane = 0.62;
	for (const station of stations) {
		const distance = Math.hypot(x - station, y - lane);
		if (distance < 0.052) return 1;
		if (distance < 0.105) return 0.28;
		if (distance < 0.13) return 0.95;
	}
	const onLine = Math.abs(y - lane) < 0.016 && x > 0.17 && x < 0.83;
	const packetAt = 0.17 + ((seconds * 0.42) % 1) * 0.66;
	if (Math.hypot(x - packetAt, y - lane) < 0.045) return 1;
	if (onLine) return 0.55;
	const added = Math.floor(seconds * 1.26) % 4;
	for (let level = 0; level < added; level++) {
		const top = 0.42 - level * 0.115;
		if (box(x, y, 0.83, top, 0.1, 0.04) < 0)
			return level === added - 1 ? 1 : 0.68;
	}
	return 0;
};

export const hardwareField: LightField = (x, y, seconds) => {
	const plug = box(x, y, 0.86, 0.5, 0.08, 0.075);
	if (plug < 0) return Math.abs(y - 0.5) < 0.022 ? 0.2 : 0.7;
	const body = box(x, y, 0.45, 0.5, 0.33, 0.2);
	if (body > 0.03) {
		const rings = Math.hypot(x - 0.42, y - 0.5);
		const wave = ((seconds * 0.5) % 1) * 0.48;
		return Math.abs(rings - wave) < 0.018 && rings > 0.2
			? 0.85 * (1 - wave / 0.48)
			: 0;
	}
	if (body > -0.024) return 0.95;
	const hole = Math.hypot(x - 0.2, y - 0.5);
	if (hole < 0.05) return 0;
	const touch = Math.hypot(x - 0.46, y - 0.5);
	const press = 0.5 + 0.5 * Math.sin(seconds * tau * 0.5);
	if (touch < 0.09) return 0.45 + 0.55 * press;
	if (touch < 0.115) return 0.1;
	return 0.16 + 0.34 * sweep(x, y, seconds);
};
