import {
	drawFox,
	foxCanvasSize,
	foxFootLine,
	foxOriginX,
	foxPixelsPerUnit,
	foxSpeed,
	midLeapPhase,
	strideLength,
} from "./fox";
import { createProgram, createTexture, fillScreen, updateTexture } from "./gl";
import { groundAt, groundBaseline } from "./ground";
import {
	leapAt,
	type Sky,
	type StoneKind,
	signalAt,
	skyAt,
	stonesAt,
} from "./journey";
import { fragmentShader, vertexShader } from "./shader";
import { contractGems, gemOrder, hexAtlas, wordmark } from "./textures";

const maxPixelRatio = 1.5;
const driftPerSecond = 0.006;
const wordFont = "Gloock, Georgia, serif";
const stoneSpacing = strideLength * 6;
const stoneSize = 0.94;
const verifiedStoneSize = 0.74;
const calloutAhead = 1.05;
const calloutHeight = 1;
const calloutAbove = 1.9;
const stillPhase = 0.42;
const contentWidth = 1264;
const minMoonRoom = 0.05;

function foxScreenX(aspect: number) {
	return aspect * (aspect < 1 ? 0.5 : 0.36);
}

function foxUnitFor(aspect: number) {
	return Math.min(0.2, aspect * 0.15);
}

function compiledProgram(gl: WebGLRenderingContext) {
	try {
		return createProgram(gl, vertexShader, fragmentShader);
	} catch {
		return null;
	}
}

export function startWorld(
	canvas: HTMLCanvasElement,
	callout: HTMLElement | null,
	reduced: boolean,
): () => void {
	const gl = canvas.getContext("webgl", {
		antialias: false,
		alpha: false,
		powerPreference: "low-power",
	});
	if (!gl) return () => {};
	const program = compiledProgram(gl);
	const foxCanvas = document.createElement("canvas");
	foxCanvas.width = foxCanvasSize.width;
	foxCanvas.height = foxCanvasSize.height;
	const foxPen = foxCanvas.getContext("2d");
	if (!program || !foxPen) return () => {};

	fillScreen(gl, program);
	const uniform = (name: string) => gl.getUniformLocation(program, name);

	createTexture(gl, 0, foxCanvas);
	createTexture(gl, 1, wordmark("codemark", wordFont));
	createTexture(gl, 2, hexAtlas());
	createTexture(gl, 3, contractGems());
	gl.uniform1i(uniform("uFox"), 0);
	gl.uniform1i(uniform("uWord"), 1);
	gl.uniform1i(uniform("uGlyphs"), 2);
	gl.uniform1i(uniform("uGems"), 3);

	let width = 0;
	let height = 0;
	let ratio = 1;
	const resize = () => {
		ratio = Math.min(window.devicePixelRatio || 1, maxPixelRatio);
		width = window.innerWidth;
		height = window.innerHeight;
		canvas.width = Math.round(width * ratio);
		canvas.height = Math.round(height * ratio);
		gl.viewport(0, 0, canvas.width, canvas.height);
	};
	resize();

	const startedAt = performance.now();
	let lastNow = startedAt;
	let travel = 0;
	let distance = 0;
	let frame = 0;
	let signal: StoneKind | "" = "";

	const setSky = (sky: Sky, now: number) => {
		gl.uniform2f(uniform("uResolution"), canvas.width, canvas.height);
		gl.uniform1f(uniform("uPixelRatio"), ratio);
		gl.uniform1f(uniform("uTime"), reduced ? 0 : (now - startedAt) / 1000);
		gl.uniform1f(uniform("uTravel"), travel);
		gl.uniform1f(uniform("uLift"), sky.lift);
		gl.uniform1f(uniform("uNight"), sky.night);
		gl.uniform1f(uniform("uDawn"), sky.dawn);
		gl.uniform1f(uniform("uJourney"), sky.journey);
		gl.uniform1f(
			uniform("uMoonRoom"),
			Math.max(minMoonRoom, ((width - contentWidth) / 2 / height) * 0.92),
		);
		gl.uniform2f(uniform("uSun"), sky.sunX, sky.sunY);
	};

	const setStones = (sky: Sky, aspect: number, unit: number) => {
		const stones = stonesAt(travel, stoneSpacing * unit);
		gl.uniform4fv(
			uniform("uStones"),
			new Float32Array(
				stones.flatMap((stone) => [
					stone.x,
					stone.base,
					gemOrder.indexOf(stone.kind),
					(stone.kind === "verified" ? verifiedStoneSize : stoneSize) * unit,
				]),
			),
		);
		if (!callout) return;
		const foxX = foxScreenX(aspect);
		const next = signalAt(stones, foxX, aspect - foxX);
		if (next !== signal) {
			signal = next;
			callout.dataset.kind = next;
			if (!reduced) {
				callout.animate(
					{ scale: [0.92, 1] },
					{ duration: 180, easing: "ease-out" },
				);
			}
		}
		const narrow = aspect < 1;
		const anchorX = narrow ? foxX : foxX + calloutAhead * unit;
		const anchorY =
			groundBaseline + (narrow ? calloutAbove : calloutHeight) * unit;
		callout.style.left = `${(anchorX / aspect) * 100}%`;
		callout.style.bottom = `${anchorY * 100}%`;
		callout.style.opacity = String(Math.max(0, sky.dawn * 5 - 4));
	};

	const setFox = (sky: Sky, aspect: number, unit: number) => {
		if (sky.dawn <= 0.02) {
			gl.uniform4f(uniform("uFoxRect"), 0, 0, 0, 0);
			return;
		}
		const foxX = foxScreenX(aspect);
		const foxWorld = foxX + travel;
		const spacing = stoneSpacing * unit;
		const footHeight = groundAt(foxWorld);
		drawFox(foxPen, {
			phase: reduced
				? stillPhase
				: (foxWorld / unit / strideLength + midLeapPhase) % 1,
			distance,
			leap: leapAt(foxWorld, spacing, unit),
			ground: (x) => -(groundAt(foxWorld + x * unit) - footHeight) / unit,
			airborne: (x) => leapAt(foxWorld + x * unit, spacing, unit).lift > 0,
		});
		updateTexture(gl, 0, foxCanvas);
		const boxWidth = (foxCanvasSize.width / foxPixelsPerUnit) * unit;
		const boxHeight = (foxCanvasSize.height / foxPixelsPerUnit) * unit;
		gl.uniform4f(
			uniform("uFoxRect"),
			foxX - boxWidth * foxOriginX,
			footHeight - sky.lift * 0.82 - boxHeight * (1 - foxFootLine),
			boxWidth,
			boxHeight,
		);
	};

	const render = (now: number) => {
		const delta = Math.min(0.05, (now - lastNow) / 1000);
		lastNow = now;
		const maxScroll = Math.max(
			1,
			document.documentElement.scrollHeight - height,
		);
		const sky = skyAt(window.scrollY, { width, height, maxScroll });
		const aspect = width / height;
		const unit = foxUnitFor(aspect);
		if (!reduced) {
			const running = sky.dawn > 0.02;
			travel += delta * (running ? foxSpeed * unit : driftPerSecond);
			if (running) distance += delta * foxSpeed;
		}
		setSky(sky, now);
		setStones(sky, aspect, unit);
		setFox(sky, aspect, unit);
		const wordWidth = Math.min(aspect * 0.96, 1.6);
		gl.uniform4f(
			uniform("uWordRect"),
			(aspect - wordWidth) / 2,
			0.2,
			wordWidth,
			wordWidth / 4,
		);
		gl.drawArrays(gl.TRIANGLES, 0, 3);
		if (!reduced) frame = requestAnimationFrame(render);
	};

	const renderOnce = () => {
		if (reduced) requestAnimationFrame(render);
	};
	const onResize = () => {
		resize();
		renderOnce();
	};
	window.addEventListener("resize", onResize);
	window.addEventListener("scroll", renderOnce, { passive: true });
	frame = requestAnimationFrame(render);

	Promise.all([
		document.fonts.load(`2rem ${wordFont}`),
		document.fonts.load("500 2rem 'JetBrains Mono'"),
	]).then(() => {
		updateTexture(gl, 1, wordmark("codemark", wordFont));
		updateTexture(gl, 2, hexAtlas());
		renderOnce();
	});

	return () => {
		cancelAnimationFrame(frame);
		window.removeEventListener("resize", onResize);
		window.removeEventListener("scroll", renderOnce);
	};
}
