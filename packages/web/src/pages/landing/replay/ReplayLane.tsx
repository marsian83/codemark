import type { MotionValue } from "motion/react";
import { cn } from "../../../utils/cn";
import { useCanvasLoop } from "../art/useCanvasLoop";
import { drawLane } from "./drawLane";
import type { Incident, IncidentStep } from "./incidents";
import { laneState } from "./timeline";

export function ReplayLane({
	incident,
	step,
	guarded,
	progress,
}: {
	incident: Incident;
	step: IncidentStep;
	guarded: boolean;
	progress: MotionValue<number>;
}) {
	const { canvasRef } = useCanvasLoop(
		(context, size, elapsed) => {
			drawLane(
				context,
				size,
				laneState(guarded, progress.get()),
				guarded,
				incident,
				elapsed,
			);
		},
		{ fps: 60 },
	);

	return (
		<article className="cartouche flex min-h-0 min-w-0 flex-col bg-night-2/95 p-5 [--chamfer:1rem]">
			<h3
				className={cn(
					"text-sm font-semibold",
					guarded ? "text-signal" : "text-flare",
				)}
			>
				{guarded ? "With Codemark in the signing path" : "What happened"}
			</h3>
			<div className="relative mt-1 h-52 min-h-0 sm:h-64 lg:h-auto lg:flex-1">
				<canvas
					ref={canvasRef}
					aria-hidden
					className="absolute inset-0 block size-full"
				/>
			</div>
			<div className="mt-2 min-h-[5.5rem] border-t border-hairline pt-3">
				<p className="text-lg leading-6 font-semibold text-sand">
					{guarded ? step.checkTitle : step.title}
				</p>
				<p className="mt-1 text-base leading-6 text-sand-2">
					{guarded ? step.withCheck : step.happened}
				</p>
			</div>
		</article>
	);
}
