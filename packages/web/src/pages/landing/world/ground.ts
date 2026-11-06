const waves = [
	{ amplitude: 0.03, frequency: 1.7, shift: 1 },
	{ amplitude: 0.012, frequency: 4.3, shift: 0.4 },
];
export const groundBaseline = 0.17;

export function groundAt(x: number): number {
	return waves.reduce(
		(height, wave) =>
			height + wave.amplitude * Math.sin(x * wave.frequency + wave.shift),
		groundBaseline,
	);
}

export function groundSlopeAt(x: number): number {
	return waves.reduce(
		(slope, wave) =>
			slope +
			wave.amplitude *
				wave.frequency *
				Math.cos(x * wave.frequency + wave.shift),
		0,
	);
}

export const groundGlsl = `float ground(float x) {
	return ${groundBaseline.toFixed(4)}${waves
		.map(
			(wave) =>
				` + ${wave.amplitude.toFixed(4)} * sin(x * ${wave.frequency.toFixed(4)} + ${wave.shift.toFixed(4)})`,
		)
		.join("")};
}`;
