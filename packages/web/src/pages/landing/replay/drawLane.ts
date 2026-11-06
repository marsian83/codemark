import { severityLabel } from "@codemark/shared/check/explain";
import { hash } from "../art/noise";
import type { CanvasSize } from "../art/useCanvasLoop";
import type { Incident } from "./incidents";
import { cellFlight, type LaneState, stops } from "./timeline";

const sand = "#f6e8d6";
const sand2 = "#e2d6c5";
const faint = "rgb(246 232 214 / 0.28)";
const empty = "rgb(246 232 214 / 0.1)";
const night = "#0d1b23";
const flare = "#ff7a5e";
const signal = "#7fd8be";
const fox = "#f6851b";
const textFont = "'Instrument Sans', sans-serif";
const labelFont = "'JetBrains Mono', monospace";

type Pen = CanvasRenderingContext2D;

type Metrics = {
	narrow: boolean;
	mid: number;
	labelY: number;
	textSize: number;
	vault: { x: number; y: number; width: number; height: number; pitch: number };
};

function chamfered(
	pen: Pen,
	x: number,
	y: number,
	w: number,
	h: number,
	c: number,
) {
	pen.beginPath();
	pen.moveTo(x + c, y);
	pen.lineTo(x + w - c, y);
	pen.lineTo(x + w, y + c);
	pen.lineTo(x + w, y + h - c);
	pen.lineTo(x + w - c, y + h);
	pen.lineTo(x + c, y + h);
	pen.lineTo(x, y + h - c);
	pen.lineTo(x, y + c);
	pen.closePath();
}

function metricsFor(width: number, height: number): Metrics {
	const narrow = width < 420;
	const vaultWidth = Math.round(Math.min(width * 0.27, 176));
	const vaultHeight = Math.round(vaultWidth * 0.62);
	const mid = Math.round(height * 0.5);
	return {
		narrow,
		mid,
		textSize: narrow ? 12 : 14,
		labelY: mid + vaultHeight / 2 + (narrow ? 10 : 16),
		vault: {
			x: Math.round(stops.wallet * width - vaultWidth / 2),
			y: Math.round(mid - vaultHeight / 2),
			width: vaultWidth,
			height: vaultHeight,
			pitch: narrow ? 5 : 6,
		},
	};
}

function caption(
	pen: Pen,
	text: string,
	x: number,
	{ labelY, textSize }: Metrics,
	width: number,
) {
	pen.font = `500 ${textSize}px ${textFont}`;
	pen.fillStyle = sand2;
	pen.textAlign = "center";
	pen.textBaseline = "top";
	const half = pen.measureText(text).width / 2 + 2;
	pen.fillText(text, Math.max(half, Math.min(width - half, x)), labelY);
}

function drawPerson(pen: Pen, x: number, y: number, color: string) {
	pen.fillStyle = color;
	pen.beginPath();
	pen.arc(x, y - 4, 3.5, 0, Math.PI * 2);
	pen.fill();
	pen.beginPath();
	pen.arc(x, y + 7, 6, Math.PI, 0);
	pen.fill();
}

function drawTag(
	pen: Pen,
	text: string,
	x: number,
	y: number,
	width: number,
	{ narrow }: Metrics,
) {
	pen.font = `500 ${narrow ? 11 : 13}px ${labelFont}`;
	const boxWidth = Math.ceil(pen.measureText(text).width) + 16;
	const boxHeight = narrow ? 22 : 26;
	const left = Math.max(1, Math.min(width - boxWidth - 1, x));
	chamfered(pen, left, y - boxHeight, boxWidth, boxHeight, 4);
	pen.fillStyle = night;
	pen.fill();
	pen.lineWidth = 1;
	pen.strokeStyle = fox;
	pen.stroke();
	pen.fillStyle = sand;
	pen.textAlign = "left";
	pen.textBaseline = "middle";
	pen.fillText(text, left + 8, y - boxHeight / 2 + 1);
}

function drawPulse(pen: Pen, state: LaneState, x: number, mid: number) {
	if (state.scatter > 0) {
		pen.fillStyle = flare;
		for (let index = 0; index < 28; index++) {
			const angle = hash(index, 17) * Math.PI * 2;
			const reach = hash(index, 18) * 44 * state.scatter;
			const size = 2.5 * (1 - state.scatter);
			pen.fillRect(
				x + Math.cos(angle) * reach,
				mid + Math.sin(angle) * reach,
				size,
				size,
			);
		}
		return;
	}
	pen.fillStyle = fox;
	pen.beginPath();
	pen.arc(x, mid, 5, 0, Math.PI * 2);
	pen.fill();
	pen.strokeStyle = "rgb(246 133 27 / 0.3)";
	pen.lineWidth = 4;
	pen.beginPath();
	pen.arc(x, mid, 9, 0, Math.PI * 2);
	pen.stroke();
}

function drawGate(
	pen: Pen,
	x: number,
	mid: number,
	size: number,
	flagged: number,
	{ narrow }: Metrics,
) {
	const half = size / 2;
	chamfered(pen, x - half, mid - half, size, size, size * 0.2);
	pen.fillStyle = flagged > 0 ? flare : night;
	pen.fill();
	pen.lineWidth = 1.5;
	pen.strokeStyle = flagged > 0 ? flare : sand;
	pen.stroke();
	pen.strokeStyle = flagged > 0 ? night : sand;
	pen.lineWidth = 2;
	pen.lineCap = "round";
	pen.lineJoin = "round";
	pen.beginPath();
	const mark = half * 0.36;
	if (flagged > 0) {
		pen.moveTo(x - mark, mid - mark);
		pen.lineTo(x + mark, mid + mark);
		pen.moveTo(x + mark, mid - mark);
		pen.lineTo(x - mark, mid + mark);
	} else {
		pen.moveTo(x - mark, mid);
		pen.lineTo(x - mark * 0.15, mid + mark * 0.7);
		pen.lineTo(x + mark, mid - mark * 0.7);
	}
	pen.stroke();
	if (flagged > 0) {
		pen.globalAlpha = flagged;
		pen.font = `600 ${narrow ? 13 : 16}px ${textFont}`;
		pen.fillStyle = flare;
		pen.textAlign = "center";
		pen.textBaseline = "bottom";
		pen.fillText(severityLabel.critical, x, mid - half - 8);
		pen.globalAlpha = 1;
	}
}

function drawVault(
	pen: Pen,
	state: LaneState,
	{ vault }: Metrics,
	attackerX: number,
) {
	const { x, y, width, height, pitch } = vault;
	const inset = 6;
	chamfered(pen, x - 0.5, y - 0.5, width + 1, height + 1, 6);
	pen.strokeStyle = state.kept > 0 ? signal : faint;
	pen.lineWidth = state.kept > 0 ? 1.5 : 1;
	pen.stroke();
	const columns = Math.floor((width - inset * 2) / pitch);
	const rows = Math.floor((height - inset * 2) / pitch);
	const size = pitch - 1.5;
	const left = x + (width - columns * pitch + 1.5) / 2;
	const top = y + (height - rows * pitch + 1.5) / 2;
	const mid = y + height / 2;
	for (let row = 0; row < rows; row++) {
		for (let column = 0; column < columns; column++) {
			const cellX = left + column * pitch;
			const cellY = top + row * pitch;
			const flight = cellFlight(hash(column, row, 7), state.drained);
			const turned = (column + hash(column, row, 3) * 3) / (columns + 3);
			if (flight === 0) {
				pen.fillStyle = turned < state.compromised ? flare : sand;
				pen.fillRect(cellX, cellY, size, size);
				continue;
			}
			pen.fillStyle = empty;
			pen.fillRect(cellX, cellY, size, size);
			if (flight < 1) {
				const eased = flight * flight * (3 - 2 * flight);
				pen.fillStyle = flare;
				pen.fillRect(
					cellX + (attackerX - cellX) * eased,
					cellY + (mid - cellY) * eased - Math.sin(eased * Math.PI) * 16,
					size,
					size,
				);
			}
		}
	}
}

function drawBalance(
	pen: Pen,
	state: LaneState,
	incident: Incident,
	{ vault, narrow }: Metrics,
) {
	const remaining = Math.round(incident.asset.amount * (1 - state.drained));
	pen.font = `600 ${narrow ? 14 : 18}px ${textFont}`;
	pen.textAlign = "center";
	pen.textBaseline = "bottom";
	pen.fillStyle =
		state.compromised > 0 || state.drained > 0
			? flare
			: state.kept > 0
				? signal
				: sand;
	pen.fillText(
		`${remaining.toLocaleString("en-US")} ${incident.asset.unit}`,
		vault.x + vault.width / 2,
		vault.y - (narrow ? 6 : 10),
	);
}

function drawAttacker(
	pen: Pen,
	state: LaneState,
	x: number,
	mid: number,
	guarded: boolean,
	elapsed: number,
) {
	const radius = 11 + state.drained * 5;
	const ripple = (elapsed / 1100) % 1;
	pen.globalAlpha = state.attacker * (guarded ? 0.45 : 1);
	if (!guarded || state.setup > 0) {
		pen.strokeStyle = flare;
		pen.lineWidth = 1;
		pen.globalAlpha *= 1 - ripple;
		pen.beginPath();
		pen.arc(x, mid, radius + 2 + ripple * 13, 0, Math.PI * 2);
		pen.stroke();
		pen.globalAlpha = state.attacker * (guarded ? 0.45 : 1);
	}
	pen.fillStyle = flare;
	pen.beginPath();
	pen.arc(x, mid, radius, 0, Math.PI * 2);
	pen.fill();
	pen.strokeStyle = night;
	pen.lineWidth = 2;
	pen.lineCap = "round";
	pen.beginPath();
	const mark = radius * 0.36;
	pen.moveTo(x - mark, mid - mark);
	pen.lineTo(x + mark, mid + mark);
	pen.moveTo(x + mark, mid - mark);
	pen.lineTo(x - mark, mid + mark);
	pen.stroke();
	pen.globalAlpha = 1;
}

export function drawLane(
	pen: Pen,
	{ width, height }: CanvasSize,
	state: LaneState,
	guarded: boolean,
	incident: Incident,
	elapsed: number,
) {
	pen.clearRect(0, 0, width, height);
	const metrics = metricsFor(width, height);
	const { mid, vault, narrow } = metrics;
	const x = (stop: number) => stop * width;
	const attackerX = x(stops.attacker);
	const signersX = x(stops.signers);
	const gateX = x(stops.check);
	const signalX = Math.min(x(state.signalAt), vault.x - 8);
	const signing = state.signalVisible && state.flagged === 0;

	pen.strokeStyle = faint;
	pen.lineWidth = 1;
	pen.beginPath();
	pen.moveTo(signersX, mid + 0.5);
	pen.lineTo(guarded && state.flagged > 0 ? gateX : vault.x, mid + 0.5);
	pen.stroke();

	pen.setLineDash([3, 5]);
	pen.strokeStyle = state.compromised > 0 ? flare : faint;
	pen.beginPath();
	pen.moveTo(vault.x + vault.width, mid + 0.5);
	pen.lineTo(attackerX, mid + 0.5);
	pen.stroke();
	pen.setLineDash([]);

	const gap = 22;
	for (let index = 0; index < incident.signers; index++) {
		const y = mid + (index - (incident.signers - 1) / 2) * gap;
		drawPerson(pen, signersX, y, signing ? fox : sand);
	}
	drawVault(pen, state, metrics, attackerX);
	drawAttacker(pen, state, attackerX, mid, guarded, elapsed);
	if (guarded)
		drawGate(pen, gateX, mid, narrow ? 32 : 44, state.flagged, metrics);

	caption(pen, incident.signerLabel, signersX, metrics, width);
	caption(pen, incident.walletLabel, x(stops.wallet), metrics, width);
	caption(pen, "Attacker", attackerX, metrics, width);
	if (guarded) caption(pen, "Codemark", gateX, metrics, width);

	drawBalance(pen, state, incident, metrics);
	if (state.signalVisible) drawPulse(pen, state, signalX, mid);

	const tagY = vault.y - (narrow ? 30 : 42);
	if (state.setup > 0) {
		pen.globalAlpha = state.setup;
		drawTag(pen, incident.setupTag, 0, tagY, width, metrics);
		pen.globalAlpha = 1;
	}
	if (signing) drawTag(pen, incident.payload, 0, tagY, width, metrics);
}
