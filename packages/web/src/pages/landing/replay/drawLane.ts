import { severityLabel } from "@codemark/shared/check/explain";
import { hash } from "../art/noise";
import type { CanvasSize } from "../art/useCanvasLoop";
import type { Incident } from "./incidents";
import { cellFlight, type LaneState, stops } from "./timeline";

const sand = "#f6e8d6";
const sand2 = "#e2d6c5";
const dim = "rgb(246 232 214 / 0.3)";
const night = "#0d1b23";
const flare = "#ff7a5e";
const signal = "#7fd8be";
const fox = "#f6851b";
const columns = 12;
const rows = 8;
const textFont = "'Instrument Sans', sans-serif";
const labelFont = "'JetBrains Mono', monospace";
const displayFont = "Gloock, Georgia, serif";

type Pen = CanvasRenderingContext2D;

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

function caption(
	pen: Pen,
	text: string,
	x: number,
	y: number,
	narrow: boolean,
) {
	pen.font = `500 ${narrow ? 12 : 15}px ${textFont}`;
	pen.fillStyle = sand2;
	pen.textAlign = "center";
	pen.textBaseline = "top";
	pen.fillText(text, x, y);
}

function drawPerson(
	pen: Pen,
	x: number,
	y: number,
	scale: number,
	color: string,
) {
	pen.fillStyle = color;
	pen.beginPath();
	pen.arc(x, y - 5 * scale, 5 * scale, 0, Math.PI * 2);
	pen.fill();
	pen.beginPath();
	pen.arc(x, y + 9 * scale, 9 * scale, Math.PI, 0);
	pen.fill();
}

function drawSigners(
	pen: Pen,
	x: number,
	mid: number,
	count: number,
	scale: number,
	signing: number,
) {
	const gap = 32 * scale;
	for (let index = 0; index < count; index++) {
		const y = mid + (index - (count - 1) / 2) * gap;
		const lit = signing > 0 && signing < 1;
		drawPerson(pen, x, y, scale, lit ? fox : sand);
	}
}

function drawTag(
	pen: Pen,
	text: string,
	x: number,
	y: number,
	width: number,
	narrow: boolean,
) {
	pen.font = `500 ${narrow ? 11 : 14}px ${labelFont}`;
	const textWidth = pen.measureText(text).width;
	const boxWidth = textWidth + 16;
	const boxHeight = narrow ? 22 : 28;
	const left = Math.max(2, Math.min(width - boxWidth - 2, x - boxWidth / 2));
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

function drawSignal(
	pen: Pen,
	state: LaneState,
	x: number,
	mid: number,
	payload: string,
	width: number,
	narrow: boolean,
) {
	if (!state.signalVisible) return;
	if (state.scatter > 0) {
		const seed = 17;
		pen.fillStyle = flare;
		for (let index = 0; index < 46; index++) {
			const angle = hash(index, seed) * Math.PI * 2;
			const reach = hash(index, seed + 1) * 70 * state.scatter;
			const size = 3.5 * (1 - state.scatter);
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
	pen.arc(x, mid, 7, 0, Math.PI * 2);
	pen.fill();
	pen.strokeStyle = "rgb(246 133 27 / 0.35)";
	pen.lineWidth = 6;
	pen.beginPath();
	pen.arc(x, mid, 12, 0, Math.PI * 2);
	pen.stroke();
	drawTag(pen, payload, x, mid - 20, width, narrow);
}

function drawGate(
	pen: Pen,
	x: number,
	mid: number,
	size: number,
	flagged: number,
	narrow: boolean,
) {
	const half = size / 2;
	chamfered(pen, x - half, mid - half, size, size, size * 0.2);
	pen.fillStyle = flagged > 0 ? flare : night;
	pen.fill();
	pen.lineWidth = 2;
	pen.strokeStyle = flagged > 0 ? flare : sand;
	pen.stroke();
	pen.strokeStyle = flagged > 0 ? night : sand;
	pen.lineWidth = 3;
	pen.lineCap = "round";
	pen.lineJoin = "round";
	pen.beginPath();
	const mark = half * 0.42;
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
		pen.font = `600 ${narrow ? 14 : 19}px ${textFont}`;
		pen.fillStyle = flare;
		pen.textAlign = "center";
		pen.textBaseline = "bottom";
		pen.fillText(severityLabel.critical, x, mid - half - 8);
		pen.globalAlpha = 1;
	}
}

function drawWallet(
	pen: Pen,
	state: LaneState,
	x: number,
	mid: number,
	unit: number,
	attackerX: number,
) {
	const gap = 2;
	const pitch = unit + gap;
	const left = x - (columns * pitch - gap) / 2;
	const top = mid - (rows * pitch - gap) / 2;
	if (state.kept > 0) {
		pen.globalAlpha = state.kept;
		chamfered(
			pen,
			left - 8,
			top - 8,
			columns * pitch - gap + 16,
			rows * pitch - gap + 16,
			8,
		);
		pen.strokeStyle = signal;
		pen.lineWidth = 2;
		pen.stroke();
		pen.globalAlpha = 1;
	}
	for (let row = 0; row < rows; row++) {
		for (let column = 0; column < columns; column++) {
			const cellX = left + column * pitch;
			const cellY = top + row * pitch;
			const flight = cellFlight(hash(column, row, 7), state.drained);
			const turned = (column + hash(column, row, 3) * 2) / (columns + 2);
			if (flight === 0) {
				pen.fillStyle = turned < state.compromised ? flare : sand;
				pen.fillRect(cellX, cellY, unit, unit);
				continue;
			}
			pen.fillStyle = "rgb(246 232 214 / 0.12)";
			pen.fillRect(cellX, cellY, unit, unit);
			if (flight < 1) {
				const eased = flight * flight * (3 - 2 * flight);
				const size = unit * (1 - eased * 0.5);
				pen.fillStyle = flare;
				pen.fillRect(
					cellX + (attackerX - cellX) * eased,
					cellY + (mid - cellY) * eased - Math.sin(eased * Math.PI) * 26,
					size,
					size,
				);
			}
		}
	}
	return top;
}

function drawBalance(
	pen: Pen,
	state: LaneState,
	incident: Incident,
	x: number,
	y: number,
	narrow: boolean,
) {
	const remaining = Math.round(incident.asset.amount * (1 - state.drained));
	pen.font = `${narrow ? 19 : 32}px ${displayFont}`;
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
		x,
		y,
	);
}

function drawAttacker(
	pen: Pen,
	state: LaneState,
	x: number,
	mid: number,
	guarded: boolean,
	elapsed: number,
	narrow: boolean,
) {
	const radius = (narrow ? 13 : 19) + state.drained * 14;
	const pulse = 0.5 + 0.5 * Math.sin(elapsed / 240);
	pen.globalAlpha = state.attacker * (guarded ? 0.45 : 1);
	pen.strokeStyle = flare;
	pen.lineWidth = 2;
	pen.beginPath();
	pen.arc(x, mid, radius + 6 + pulse * 4, 0, Math.PI * 2);
	pen.stroke();
	pen.fillStyle = flare;
	pen.beginPath();
	pen.arc(x, mid, radius, 0, Math.PI * 2);
	pen.fill();
	pen.strokeStyle = night;
	pen.lineWidth = 3;
	pen.lineCap = "round";
	pen.beginPath();
	const mark = radius * 0.38;
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
	const narrow = width < 420;
	const mid = Math.round(height * 0.53);
	const unit = Math.max(
		4,
		Math.min(15, Math.min(width * 0.68, height * 1.45) / 26),
	);
	const scale = narrow ? 0.85 : 1.35;
	const x = (stop: number) => stop * width;
	const walletX = x(stops.wallet);
	const attackerX = x(stops.attacker);
	const signersX = x(stops.signers);
	const gateX = x(stops.check);

	pen.strokeStyle = dim;
	pen.lineWidth = 1.5;
	pen.beginPath();
	pen.moveTo(signersX, mid);
	pen.lineTo(guarded && state.flagged > 0 ? gateX : walletX, mid);
	pen.stroke();

	pen.setLineDash([3, 6]);
	pen.strokeStyle = state.compromised > 0 ? flare : dim;
	pen.beginPath();
	pen.moveTo(walletX, mid);
	pen.lineTo(attackerX, mid);
	pen.stroke();
	pen.setLineDash([]);

	drawSigners(
		pen,
		signersX,
		mid,
		incident.signers,
		scale,
		state.signalVisible && !state.flagged ? 0.5 : 0,
	);
	const top = drawWallet(pen, state, walletX, mid, unit, attackerX);
	drawAttacker(pen, state, attackerX, mid, guarded, elapsed, narrow);

	const gateSize = narrow ? 40 : 68;
	if (guarded) drawGate(pen, gateX, mid, gateSize, state.flagged, narrow);

	const labelY = mid + (rows * (unit + 2)) / 2 + (narrow ? 8 : 14);
	caption(pen, incident.signerLabel, signersX, labelY, narrow);
	caption(pen, incident.walletLabel, walletX, labelY, narrow);
	caption(pen, "Attacker", attackerX, labelY, narrow);
	if (guarded) caption(pen, "Codemark", gateX, labelY, narrow);

	drawBalance(
		pen,
		state,
		incident,
		walletX,
		top - (state.kept > 0 ? 14 : 8),
		narrow,
	);
	drawSignal(
		pen,
		state,
		x(state.signalAt),
		mid,
		incident.payload,
		width,
		narrow,
	);
}
