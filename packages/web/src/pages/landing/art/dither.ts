import type { CanvasSize } from "./useCanvasLoop";

const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

export type LightField = (x: number, y: number, seconds: number) => number;
export type Inks = { low: string; high: string };

export function drawDither(
	pen: CanvasRenderingContext2D,
	{ width, height }: CanvasSize,
	field: LightField,
	seconds: number,
	cell: number,
	inks: Inks,
) {
	pen.clearRect(0, 0, width, height);
	const columns = Math.floor(width / cell);
	const rows = Math.floor(height / cell);
	const size = cell - 0.5;
	for (let row = 0; row < rows; row++) {
		for (let column = 0; column < columns; column++) {
			const light = field(
				(column + 0.5) / columns,
				(row + 0.5) / rows,
				seconds,
			);
			const threshold = (bayer[(row % 4) * 4 + (column % 4)] + 0.5) / 16;
			if (light <= threshold) continue;
			pen.fillStyle = light > 0.72 ? inks.high : inks.low;
			pen.fillRect(column * cell, row * cell, size, size);
		}
	}
}
