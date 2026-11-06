import type { StoneKind } from "./journey";

const hexChars = "0123456789abcdef";
const glyphSize = 32;

export function hexAtlas(): HTMLCanvasElement {
	const atlas = document.createElement("canvas");
	atlas.width = glyphSize * hexChars.length;
	atlas.height = glyphSize;
	const pen = atlas.getContext("2d");
	if (!pen) return atlas;
	pen.font = `500 ${glyphSize * 0.86}px 'JetBrains Mono', monospace`;
	pen.textAlign = "center";
	pen.textBaseline = "middle";
	pen.fillStyle = "#fff";
	[...hexChars].forEach((char, index) => {
		pen.fillText(char, (index + 0.5) * glyphSize, glyphSize * 0.54);
	});
	return atlas;
}

export function wordmark(text: string, font: string): HTMLCanvasElement {
	const canvas = document.createElement("canvas");
	canvas.width = 2048;
	canvas.height = 512;
	const pen = canvas.getContext("2d");
	if (!pen) return canvas;
	const size = 560;
	pen.font = `600 ${size}px ${font}`;
	const fitted =
		size * Math.min(1, (canvas.width * 0.98) / pen.measureText(text).width);
	pen.font = `600 ${fitted}px ${font}`;
	pen.textAlign = "center";
	pen.textBaseline = "alphabetic";
	pen.fillStyle = "#fff";
	pen.fillText(text, canvas.width / 2, canvas.height * 0.82);
	return canvas;
}

const solidity: [number, number][][] = [
	[
		[4.409, 6.608],
		[7.981, 0.255],
		[11.553, 6.608],
	],
	[
		[8.411, 0],
		[11.98, 6.348],
		[15.552, 0],
	],
	[
		[12.267, 6.858],
		[19.695, 6.858],
		[15.982, 0.255],
	],
	[
		[4.409, 7.108],
		[11.839, 7.108],
		[8.124, 13.713],
	],
	[
		[12.161, 16.892],
		[19.594, 16.892],
		[15.876, 10.287],
	],
	[
		[4.306, 17.142],
		[11.733, 17.142],
		[8.018, 23.745],
	],
	[
		[12.447, 17.392],
		[19.594, 17.392],
		[16.019, 23.746],
	],
	[
		[8.448, 24],
		[15.589, 24],
		[12.02, 17.651],
	],
];

const gemTones: Record<StoneKind, { lit: string; mid: string; shade: string }> =
	{
		verified: { lit: "#b6f3df", mid: "#7fd8be", shade: "#3f9f88" },
		revoked: { lit: "#ffa18c", mid: "#ff6a4d", shade: "#c23a24" },
	};

export const gemOrder: StoneKind[] = ["verified", "revoked"];

function drawGem(pen: CanvasRenderingContext2D, kind: StoneKind, size: number) {
	const tones = gemTones[kind];
	const facets = [
		tones.mid,
		tones.lit,
		tones.mid,
		tones.shade,
		tones.mid,
		tones.mid,
		tones.shade,
		tones.lit,
	];
	const scale = size / 24;
	solidity.forEach((points, index) => {
		pen.beginPath();
		points.forEach(([x, y], corner) => {
			if (corner === 0) pen.moveTo(x * scale, y * scale);
			else pen.lineTo(x * scale, y * scale);
		});
		pen.closePath();
		pen.fillStyle = facets[index];
		pen.fill();
	});
	const center = size / 2;
	const radius = size * 0.17;
	pen.beginPath();
	pen.arc(center, center, radius, 0, Math.PI * 2);
	pen.fillStyle = "#0d1b23";
	pen.fill();
	pen.lineWidth = radius * 0.3;
	pen.lineCap = "round";
	pen.lineJoin = "round";
	pen.strokeStyle = tones.lit;
	pen.beginPath();
	const mark = radius * 0.5;
	if (kind === "verified") {
		pen.moveTo(center - mark, center + mark * 0.05);
		pen.lineTo(center - mark * 0.2, center + mark * 0.75);
		pen.lineTo(center + mark, center - mark * 0.7);
	} else {
		pen.moveTo(center - mark, center - mark);
		pen.lineTo(center + mark, center + mark);
		pen.moveTo(center + mark, center - mark);
		pen.lineTo(center - mark, center + mark);
	}
	pen.stroke();
}

export function contractGems(): HTMLCanvasElement {
	const size = 512;
	const atlas = document.createElement("canvas");
	atlas.width = size * gemOrder.length;
	atlas.height = size;
	const pen = atlas.getContext("2d");
	if (!pen) return atlas;
	gemOrder.forEach((kind, index) => {
		pen.save();
		pen.translate(size * index, 0);
		drawGem(pen, kind, size);
		pen.restore();
	});
	return atlas;
}
