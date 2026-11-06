import { useCallback, useEffect, useRef } from "react";

export type CanvasSize = { width: number; height: number };

export type CanvasScene = (
	context: CanvasRenderingContext2D,
	size: CanvasSize,
	elapsed: number,
) => void;

const maxPixelRatio = 2;

export function useCanvasLoop(
	scene: CanvasScene,
	{ fps = 30, running = true }: { fps?: number; running?: boolean } = {},
) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const sceneRef = useRef(scene);
	sceneRef.current = scene;
	const redrawRef = useRef(() => {});

	useEffect(() => {
		const canvas = canvasRef.current;
		const context = canvas?.getContext("2d");
		if (!canvas || !context) return;

		const size: CanvasSize = { width: 0, height: 0 };
		const startedAt = performance.now();
		const draw = (now: number) =>
			sceneRef.current(context, size, now - startedAt);
		redrawRef.current = () => draw(performance.now());

		const resize = new ResizeObserver(([entry]) => {
			const ratio = Math.min(window.devicePixelRatio || 1, maxPixelRatio);
			size.width = entry.contentRect.width;
			size.height = entry.contentRect.height;
			canvas.width = Math.round(size.width * ratio);
			canvas.height = Math.round(size.height * ratio);
			context.setTransform(ratio, 0, 0, ratio, 0, 0);
			draw(performance.now());
		});
		resize.observe(canvas);

		let visible = true;
		const intersection = new IntersectionObserver(([entry]) => {
			visible = entry.isIntersecting;
		});
		intersection.observe(canvas);

		let frame = 0;
		let last = 0;
		const interval = 1000 / fps;
		const loop = (now: number) => {
			frame = requestAnimationFrame(loop);
			if (!visible || now - last < interval) return;
			last = now;
			draw(now);
		};
		if (running) frame = requestAnimationFrame(loop);

		return () => {
			cancelAnimationFrame(frame);
			resize.disconnect();
			intersection.disconnect();
		};
	}, [fps, running]);

	const redraw = useCallback(() => redrawRef.current(), []);
	return { canvasRef, redraw };
}
