import { clamp01 } from "../art/noise";

export const stepCount = 5;

export const stops = {
	signers: 0.1,
	check: 0.34,
	wallet: 0.6,
	attacker: 0.9,
};

export type LaneState = {
	attacker: number;
	signalAt: number;
	signalVisible: boolean;
	scatter: number;
	flagged: number;
	compromised: number;
	drained: number;
	kept: number;
};

function between(from: number, to: number, t: number): number {
	return clamp01((t - from) / (to - from));
}

function mix(from: number, to: number, amount: number): number {
	return from + (to - from) * amount;
}

export function laneState(guarded: boolean, t: number): LaneState {
	const attacker = between(0, 0.1, t);
	if (guarded) {
		return {
			attacker,
			signalAt: mix(stops.signers, stops.check, between(0.4, 0.54, t)),
			signalVisible: t >= 0.4 && t < 0.72,
			scatter: between(0.56, 0.72, t),
			flagged: between(0.54, 0.58, t),
			compromised: 0,
			drained: 0,
			kept: between(0.8, 0.88, t),
		};
	}
	return {
		attacker,
		signalAt: mix(stops.signers, stops.wallet, between(0.4, 0.6, t)),
		signalVisible: t >= 0.4 && t < 0.62,
		scatter: 0,
		flagged: 0,
		compromised: between(0.6, 0.78, t),
		drained: between(0.8, 0.98, t) ** 1.3,
		kept: 0,
	};
}

const flightShare = 0.25;

export function cellFlight(order: number, drained: number): number {
	return clamp01((drained - order * (1 - flightShare)) / flightShare);
}

export function stepAt(t: number): number {
	return Math.min(stepCount - 1, Math.floor(clamp01(t) * stepCount));
}

export function endOfStep(step: number): number {
	return step === stepCount - 1 ? 1 : (step + 0.9) / stepCount;
}
