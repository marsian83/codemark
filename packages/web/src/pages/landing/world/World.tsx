import { useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";
import { startWorld } from "./engine";

export function World() {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const calloutRef = useRef<HTMLDivElement>(null);
	const reduced = Boolean(useReducedMotion());

	useEffect(() => {
		if (!canvasRef.current) return;
		return startWorld(canvasRef.current, calloutRef.current, reduced);
	}, [reduced]);

	return (
		<div aria-hidden className="fixed inset-0 -z-10 overflow-hidden">
			<canvas ref={canvasRef} className="block size-full" />
			<div
				ref={calloutRef}
				data-kind="verified"
				className="group cartouche absolute bg-night max-sm:-translate-x-1/2 px-4 py-2 whitespace-nowrap opacity-0 [--chamfer:0.375rem]"
			>
				<div className="group-data-[kind=revoked]:hidden">
					<p className="text-base font-semibold text-signal">Verified</p>
					<p className="font-label text-xs text-sand">
						pwnmeswap.eth · router 3.1.0
					</p>
				</div>
				<div className="hidden group-data-[kind=revoked]:block">
					<p className="text-base font-semibold text-flare">Key revoked</p>
					<p className="font-label text-xs text-sand">
						pwnmeswap.eth: CI key leaked
					</p>
				</div>
			</div>
		</div>
	);
}
