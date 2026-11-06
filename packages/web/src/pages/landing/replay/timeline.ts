import { clamp01 } from "../art/noise";

export const stepCount = 4;

export const stops = {
	signers: 0.1,
	check: 0.34,
	wallet: 0.62,
	attacker: 0.9,
};

export type LaneState = {
	attacker: number;
	setup: number;
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
	const attacker = between(0, 0.08, t);
	const setup = t < 0.25 ? between(0.02, 0.08, t) : 0;
	if (guarded) {
		return {
			attacker,
			setup,
			signalAt: mix(stops.signers, stops.check, between(0.25, 0.38, t)),
			signalVisible: t >= 0.25 && t < 0.6,
			scatter: between(0.42, 0.6, t),
			flagged: between(0.38, 0.42, t),
			compromised: 0,
			drained: 0,
			kept: between(0.75, 0.83, t),
		};
	}
	return {
		attacker,
		setup,
		signalAt: mix(stops.signers, stops.wallet, between(0.25, 0.48, t)),
		signalVisible: t >= 0.25 && t < 0.5,
		scatter: 0,
		flagged: 0,
		compromised: between(0.5, 0.72, t),
		drained: between(0.75, 0.97, t) ** 1.3,
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
