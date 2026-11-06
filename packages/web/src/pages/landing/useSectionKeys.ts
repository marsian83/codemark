import {
	type AnimationPlaybackControls,
	animate,
	useReducedMotion,
} from "motion/react";
import { useEffect } from "react";
import { allStops } from "./sectionStops";

const arrivedWithin = 2;
const glideSeconds = 1.5;
const glideEase = [0.4, 0, 0.2, 1] as const;
const keysOwnedBy =
	"input, textarea, select, [contenteditable], [role='radio'], [role='tab'], [role='slider'], [role='listbox'], [role='menu']";
const manualScrollEvents = ["wheel", "touchstart", "mousedown"] as const;

function ownsArrowKeys(target: EventTarget | null) {
	return target instanceof Element && target.closest(keysOwnedBy) !== null;
}

function movesBetweenStops(event: KeyboardEvent) {
	if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return false;
	if (event.defaultPrevented || ownsArrowKeys(event.target)) return false;
	return !(event.altKey || event.ctrlKey || event.metaKey || event.shiftKey);
}

export function useSectionKeys() {
	const reduced = useReducedMotion();

	useEffect(() => {
		let destination = 0;
		let glide: AnimationPlaybackControls | null = null;

		function stopGlide() {
			glide?.stop();
			glide = null;
		}

		function onKeyDown(event: KeyboardEvent) {
			if (!movesBetweenStops(event)) {
				stopGlide();
				return;
			}
			event.preventDefault();
			if (event.repeat) return;

			const from = glide ? destination : window.scrollY;
			const stops = allStops();
			const next =
				event.key === "ArrowDown"
					? stops.find((stop) => stop > from + arrivedWithin)
					: stops.findLast((stop) => stop < from - arrivedWithin);
			if (next === undefined) return;

			stopGlide();
			if (reduced) {
				window.scrollTo(0, next);
				return;
			}
			destination = next;
			glide = animate(window.scrollY, next, {
				duration: glideSeconds,
				ease: glideEase,
				onUpdate: (top) => window.scrollTo(0, top),
				onComplete: () => {
					glide = null;
				},
			});
		}

		window.addEventListener("keydown", onKeyDown);
		for (const name of manualScrollEvents) {
			window.addEventListener(name, stopGlide, { passive: true });
		}
		return () => {
			stopGlide();
			window.removeEventListener("keydown", onKeyDown);
			for (const name of manualScrollEvents) {
				window.removeEventListener(name, stopGlide);
			}
		};
	}, [reduced]);
}
