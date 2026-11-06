import { useReducedMotion } from "motion/react";
import { cn } from "../../../utils/cn";
import { drawDither, type Inks, type LightField } from "./dither";
import { useCanvasLoop } from "./useCanvasLoop";

const stillSeconds = 1.3;

export function DitherArt({
	field,
	inks,
	cell = 4,
	className,
}: {
	field: LightField;
	inks: Inks;
	cell?: number;
	className?: string;
}) {
	const reduced = useReducedMotion();
	const { canvasRef } = useCanvasLoop(
		(context, size, elapsed) => {
			if (!size.width || !size.height) return;
			const seconds = reduced ? stillSeconds : elapsed / 1000;
			drawDither(context, size, field, seconds, cell, inks);
		},
		{ fps: 24, running: !reduced },
	);
	return (
		<canvas
			ref={canvasRef}
			aria-hidden
			className={cn("block size-full", className)}
		/>
	);
}
